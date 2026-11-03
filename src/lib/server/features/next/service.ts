/**
 * Finishing an item, and what to do next so what was learned carries forward (US-075). Ranking is
 * free (shared skills + cached embeddings); the AI only picks among the top few (1 credit), with a
 * rule-based fallback.
 */
import { feedQuietly, type FeedResult } from '$lib/server/features/pet/service';
import { and, eq, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items, projects, roadmaps } from '$lib/server/db/schema';
import { generateJson } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { embedItems } from '$lib/server/features/memory/embed';
import { recallMemories } from '$lib/server/features/memory/recall';
import { remember } from '$lib/server/features/memory/service';
import { shortTitle, titleKey } from '$lib/server/features/items/title';
import { NEXT_SYSTEM, nextPrompt, readNext } from './prompt';
import { rankCandidates, type NextCandidate } from './rank';

type Platform = App.Platform | undefined;

export interface NextSuggestion {
	item: { id: string; title: string };
	reason: string;
	carriesOver: string[];
	/** The model that picked, or "rule" when the free fallback did. */
	pickedBy: string;
	/** The runners-up, so the user can choose another. */
	alternatives: { id: string; title: string; shared: string[] }[];
}

const OPEN = ['shortlist', 'ready', 'paused', 'focus'] as const;
/** Embedding only the best skill matches keeps first-time embeds few (cost rule 4). */
const MAX_EMBEDDED = 12;
const MAX_FOR_AI = 5;

export async function suggestNext(
	platform: Platform,
	userId: string,
	itemId: string
): Promise<NextSuggestion | null> {
	const found = await withDb(platform, async (db) => {
		const [item] = await db
			.select({ id: items.id, title: items.title })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)));
		if (!item) return null;
		const today = new Date().toISOString().slice(0, 10);
		const others = await db
			.select({ id: items.id, title: items.title })
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					ne(items.id, itemId),
					inArray(items.status, [...OPEN]),
					or(isNull(items.parkedUntil), lte(items.parkedUntil, today))
				)
			)
			.limit(40);
		const ids = [itemId, ...others.map((o) => o.id)];
		const facts = await db
			.select({ itemId: analyses.itemId, skills: analyses.skills, summary: analyses.summary })
			.from(analyses)
			.where(inArray(analyses.itemId, ids));
		const [roadmap] = await db
			.select({ skills: roadmaps.skills })
			.from(roadmaps)
			.where(eq(roadmaps.itemId, itemId));
		return { item, others, facts, roadmapSkills: (roadmap?.skills as string[] | null) ?? [] };
	});
	if (!found || found.others.length === 0) return null;
	const { item, others, facts, roadmapSkills } = found;

	const factsOf = (id: string) => facts.find((f) => f.itemId === id);
	const finishedSkills = [...new Set([...roadmapSkills, ...(factsOf(item.id)?.skills ?? [])])];
	// The same thing saved twice isn't a next step: skip copies of the finished item, keep one of each.
	const seen = new Set([titleKey(item.title)]);
	const candidates: NextCandidate[] = others
		.filter((o) => {
			const key = titleKey(o.title);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.map((o) => ({
			id: o.id,
			title: o.title,
			skills: factsOf(o.id)?.skills ?? [],
			summary: factsOf(o.id)?.summary ?? null
		}));
	if (candidates.length === 0) return null;

	// Free pre-rank by skills, then meaning for the best few (embeddings are cached on items).
	const bySkills = rankCandidates(finishedSkills, candidates, null, item.id).slice(0, MAX_EMBEDDED);
	const vectors = await embedItems(platform, userId, [
		{ id: item.id, text: `${item.title}. ${factsOf(item.id)?.summary ?? ''}` },
		...bySkills.map((c) => ({ id: c.id, text: `${c.title}. ${c.summary ?? ''}` }))
	]);
	const ranked = rankCandidates(finishedSkills, bySkills, vectors, item.id);
	const top = ranked.slice(0, MAX_FOR_AI);

	const memories = await recallMemories(
		platform,
		userId,
		`What I learned from "${item.title}" and what I want to do next`
	);
	let pick: { itemId: string; reason: string; carriesOver: string[] } | null = null;
	let pickedBy = 'rule';
	try {
		const result = await withCredits(
			platform,
			userId,
			'next',
			async () => {
				const r = await generateJson(platform, {
					system: NEXT_SYSTEM,
					prompt: nextPrompt({
						finished: { title: item.title, skills: finishedSkills },
						options: top,
						memories
					})
				});
				const read = readNext(
					r.data,
					top.map((t) => t.id)
				);
				// Thrown inside withCredits, so an unusable answer is refunded.
				if (!read) throw new Error('The model picked something that is not an option');
				return { read, model: r.model };
			},
			{ ref: `next:${item.id}` }
		);
		pick = result.read;
		pickedBy = result.model;
	} catch (e) {
		console.warn('[next] falling back to the rule:', e instanceof Error ? e.message : e);
	}

	const best = top.find((t) => t.id === pick?.itemId) ?? top[0];
	return {
		item: { id: best.id, title: best.title },
		reason:
			pick?.reason ??
			(best.shared.length
				? `It builds on what you just finished: ${best.shared.slice(0, 3).join(', ')}.`
				: 'It is the closest match to what you just finished.'),
		carriesOver: pick?.carriesOver.length ? pick.carriesOver : best.shared,
		pickedBy,
		alternatives: ranked
			.filter((r) => r.id !== best.id)
			.slice(0, 3)
			.map((r) => ({ id: r.id, title: r.title, shared: r.shared }))
	};
}

export type FinishResult =
	| {
			status: 'finished';
			item: { id: string; title: string };
			next: NextSuggestion | null;
			/** The feast for finishing, or null when there's no pet. */
			fed: FeedResult | null;
	  }
	| { status: 'not_found' };

/** Marks an item done, remembers what it built, and suggests what to do next. */
export async function finishItem(
	platform: Platform,
	userId: string,
	itemId: string,
	note?: string
): Promise<FinishResult> {
	const finished = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const [item] = await tx
				.update(items)
				.set({ status: 'done', lastActiveAt: new Date() })
				.where(
					and(eq(items.id, itemId), eq(items.userId, userId), inArray(items.status, [...OPEN]))
				)
				.returning({ id: items.id, title: items.title });
			if (!item) return null;
			await tx
				.update(projects)
				.set({ status: 'done', completedAt: new Date() })
				.where(eq(projects.itemId, itemId));
			const [facts] = await tx
				.select({ skills: analyses.skills })
				.from(analyses)
				.where(eq(analyses.itemId, itemId));
			const [roadmap] = await tx
				.select({ skills: roadmaps.skills })
				.from(roadmaps)
				.where(eq(roadmaps.itemId, itemId));
			const skills = [
				...new Set([...((roadmap?.skills as string[] | null) ?? []), ...(facts?.skills ?? [])])
			];
			return { item, skills };
		})
	);
	if (!finished) return { status: 'not_found' };

	// What it built: the next roadmap recalls this and skips what they already know (US-075 AC-03).
	await remember(platform, userId, {
		type: 'lesson_learned',
		summary: `Finished "${shortTitle(finished.item.title)}".${finished.skills.length ? ` Skills built: ${finished.skills.slice(0, 8).join(', ')}.` : ''}${note ? ` Their note: ${note.slice(0, 300)}` : ''}`,
		sourceType: 'item',
		sourceId: itemId
	}).catch((e) => console.error('[next] remember failed', e));

	const next = await suggestNext(platform, userId, itemId).catch((e) => {
		console.error('[next] suggestion failed', e);
		return null;
	});
	const fed = await feedQuietly(platform, userId, { type: 'item', id: itemId }, 'feast');
	return { status: 'finished', item: finished.item, next, fed };
}
