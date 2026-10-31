/**
 * The confirm card: what the app understood an item to be (intent, kind of practice, goal, date),
 * shown at Start or when it's picked for the month. Confirming plans the roadmap toward it;
 * a correction is remembered so future guesses improve.
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { enqueue } from '$lib/server/jobs';
import { remember } from '$lib/server/features/memory/service';
import { getRoadmap, setGoal } from '$lib/server/features/roadmap/service';
import { INTENT_IDS, INTENTS, intentOf } from './registry';
import { PRACTICE_KIND_IDS, PRACTICE_KINDS, practiceKindOf } from './practice';
import type { ConfirmInput } from './input';

type Platform = App.Platform | undefined;
type Item = typeof items.$inferSelect;

export interface Understanding {
	itemId: string;
	title: string;
	intent: { id: string; label: string };
	practiceKind: { id: string; label: string } | null;
	goal: string | null;
	targetDate: string | null;
	confirmed: boolean;
	/** What the pet says: "Looks like you want to learn a skill: … Goal: … Right?" */
	message: string;
	/** Everything each part can change to, for one-tap edits. */
	choices: {
		intents: { id: string; label: string }[];
		practiceKinds: { id: string; label: string }[];
	};
}

const CHOICES = {
	intents: INTENT_IDS.map((id) => ({ id, label: INTENTS[id].label })),
	practiceKinds: PRACTICE_KIND_IDS.map((id) => ({ id, label: PRACTICE_KINDS[id].label }))
};

export function understandingOf(
	item: Pick<
		Item,
		'id' | 'title' | 'intent' | 'practiceKind' | 'goal' | 'targetDate' | 'intentConfirmedAt'
	>
): Understanding {
	const intent = intentOf(item.intent);
	const kind = practiceKindOf(item.practiceKind);
	const message = [
		`Looks like you want to ${intent.label.toLowerCase()}: ${item.title}.`,
		item.goal && `Goal: ${item.goal.replace(/[.!]+$/, '')}.`,
		item.targetDate && `By ${item.targetDate}.`,
		'Right?'
	]
		.filter(Boolean)
		.join(' ');
	return {
		itemId: item.id,
		title: item.title,
		intent: { id: intent.id, label: intent.label },
		practiceKind: kind && { id: kind.id, label: kind.label },
		goal: item.goal,
		targetDate: item.targetDate,
		confirmed: Boolean(item.intentConfirmedAt),
		message,
		choices: CHOICES
	};
}

export async function getUnderstanding(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<Understanding | null> {
	const [item] = await withDb(platform, (db) =>
		db
			.select()
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
	);
	return item ? understandingOf(item) : null;
}

export type ConfirmResult = {
	understanding: Understanding;
	/** What happened to the plan: made, re-planned, or nothing yet (it plans at Start). */
	planning: 'generate' | 'replan' | 'none';
};

/** Confirms the card, as is or changed, then plans toward it. */
export async function confirmUnderstanding(
	platform: Platform,
	userId: string,
	itemId: string,
	input: ConfirmInput
): Promise<ConfirmResult | null> {
	const before = await withDb(platform, async (db) => {
		const [item] = await db
			.select()
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)));
		return item ?? null;
	});
	if (!before) return null;

	const [item] = await withDb(platform, (db) =>
		db
			.update(items)
			.set({
				...(input.intent !== undefined && { intent: input.intent }),
				...(input.practiceKind !== undefined && { practiceKind: input.practiceKind }),
				...(input.goal !== undefined && { goal: input.goal }),
				...(input.targetDate !== undefined && { targetDate: input.targetDate }),
				intentConfirmedAt: new Date()
			})
			.where(eq(items.id, itemId))
			.returning()
	);

	const intentChanged = item.intent !== before.intent;
	const goalChanged = item.goal !== before.goal;
	const changed =
		intentChanged ||
		goalChanged ||
		item.practiceKind !== before.practiceKind ||
		item.targetDate !== before.targetDate;
	const planning = await plan(platform, userId, item, { changed, goalChanged });

	const intent = intentOf(item.intent);
	const correction = intentChanged
		? ` (corrected: it's ${intent.label.toLowerCase()}, not ${intentOf(before.intent).label.toLowerCase()})`
		: '';
	await remember(platform, userId, {
		type: intent.memoryType,
		summary: `Confirmed: wants to ${intent.label.toLowerCase()}, "${item.title}"${correction}.${item.goal ? ` Goal: ${item.goal}` : ''}`,
		sourceType: 'item',
		sourceId: item.id
	}).catch((e) => console.error('[intents] remember failed', e));

	return { understanding: understandingOf(item), planning };
}

/**
 * First confirm on a Focus item plans its roadmap. Later changes re-plan: a fresh roadmap if
 * nothing is done yet, otherwise the milestones ahead.
 */
async function plan(
	platform: Platform,
	userId: string,
	item: Item,
	{ changed, goalChanged }: { changed: boolean; goalChanged: boolean }
): Promise<ConfirmResult['planning']> {
	const roadmap = await getRoadmap(platform, userId, item.id);
	const goal = goalChanged && item.goal ? item.goal : undefined;
	if (!roadmap) {
		if (item.status !== 'focus') return 'none';
		await enqueue(platform, 'roadmap', { itemId: item.id, mode: 'generate', goal });
		return 'generate';
	}
	if (!changed) return 'none';
	const mode = roadmap.doneSteps === 0 ? 'generate' : 'replan';
	// A new goal also goes on the roadmap, so re-plans keep it.
	if (goal) await setGoal(platform, userId, item.id, goal);
	else await enqueue(platform, 'roadmap', { itemId: item.id, mode });
	return mode;
}
