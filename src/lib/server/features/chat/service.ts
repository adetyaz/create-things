/**
 * Pet chat: recall the memories closest to the latest message, answer with them as context, and
 * cite the ones used. Saves only what's worth keeping: a stuck topic, or a lasting fact about how
 * the user works (Breakdown §10 "How chat works", §13 cost rules).
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { intentOf } from '$lib/server/features/intents/registry';
import { recallMemories, type RecalledMemory } from '$lib/server/features/memory/recall';
import { remember } from '$lib/server/features/memory/service';
import { getRoadmap } from '$lib/server/features/roadmap/service';
import { listFocus } from '$lib/server/features/focus/service';
import { getDay } from '$lib/server/features/plan/day';
import type { ChatInput } from './input';
import { CHAT_SYSTEM, chatPrompt, readChat, type ChatContext } from './prompt';

type Platform = App.Platform | undefined;

export interface ChatResult {
	reply: string;
	/** The memories the reply relied on, shown as citations. */
	memoriesUsed: RecalledMemory[];
	/** What was saved to memory from this message, if anything. */
	saved: string | null;
	model: string;
}

const ACTION = { chat: 'petChat', stuck: 'stuck', teach: 'teach' } as const;

export async function chat(
	platform: Platform,
	userId: string,
	input: ChatInput
): Promise<ChatResult | null> {
	const context = await contextFor(platform, userId, input);
	if (input.itemId && !context.item) return null;

	const latest = input.messages.at(-1)!.text;
	const memories = await recallMemories(
		platform,
		userId,
		[latest, context.item?.title].filter(Boolean).join(' — ')
	);

	const { reply, model } = await withCredits(
		platform,
		userId,
		ACTION[input.mode],
		async () => {
			const result = await generateJson(platform, {
				system: CHAT_SYSTEM,
				prompt: chatPrompt({ ...context, memories }),
				maxTokens: input.mode === 'teach' ? 1200 : 600
			});
			const reply = readChat(result.data, memories.length);
			// Thrown inside withCredits, so an empty answer is refunded.
			if (!reply) throw new Error('The model gave no reply');
			return { reply, model: result.model };
		},
		{ ref: `chat:${input.mode}` }
	);

	const saved = await save(platform, userId, input, context, reply);
	return {
		reply: reply.reply,
		memoriesUsed: reply.memoriesUsed.map((n) => memories[n - 1]),
		saved,
		model
	};
}

/** The open item and step, if any (the item's current step when no step is given). */
async function contextFor(
	platform: Platform,
	userId: string,
	input: ChatInput
): Promise<Omit<ChatContext, 'memories'>> {
	const day = await getDay(platform, userId);
	const base = {
		mode: input.mode,
		messages: input.messages,
		item: null,
		step: null,
		today: day.day,
		focus: [] as string[],
		todayBlock: null as string | null
	};
	if (!input.itemId) {
		// No item open: what they're focused on and today's first block, for "what should I do?".
		const focus = await listFocus(platform, userId);
		return {
			...base,
			focus: focus.map((f) => f.title),
			todayBlock: day.first?.intention ?? null
		};
	}
	const [item] = await withDb(platform, (db) =>
		db
			.select({ title: items.title, intent: items.intent, goal: items.goal })
			.from(items)
			.where(and(eq(items.id, input.itemId!), eq(items.userId, userId)))
	);
	if (!item) return base;
	const roadmap = await getRoadmap(platform, userId, input.itemId);
	const steps = roadmap?.milestones.flatMap((m) => m.steps) ?? [];
	const step = (input.stepId && steps.find((s) => s.id === input.stepId)) || roadmap?.currentStep;
	return {
		...base,
		item: {
			title: item.title,
			intent: intentOf(item.intent).label,
			goal: roadmap?.roadmap.goal ?? item.goal
		},
		step: step
			? { title: step.title, twoMinute: step.twoMinute, searchTerms: step.searchTerms }
			: null
	};
}

/** Cost rules: `remember` (5 points), and only when there's something worth keeping. */
async function save(
	platform: Platform,
	userId: string,
	input: ChatInput,
	context: Omit<ChatContext, 'memories'>,
	reply: { stuckTopic: string | null; rememberThis: string | null }
): Promise<string | null> {
	const on = context.item ? ` while working on "${context.item.title}"` : '';
	const memory =
		input.mode === 'stuck' && reply.stuckTopic
			? { type: 'stuck_topic' as const, summary: `Got stuck on ${reply.stuckTopic}${on}.` }
			: reply.rememberThis
				? { type: 'work_pattern' as const, summary: reply.rememberThis }
				: null;
	if (!memory) return null;
	await remember(platform, userId, {
		...memory,
		sourceType: 'chat',
		sourceId: input.itemId,
		delivery: 'remember'
	}).catch((e) => console.error('[chat] remember failed', e));
	return memory.summary;
}
