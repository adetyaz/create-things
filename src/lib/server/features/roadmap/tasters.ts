/**
 * After the taster sessions: keep it (a full plan), park it (until a day) or let it go. Letting go
 * counts as progress. What was decided, and why, is remembered.
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { enqueue } from '$lib/server/jobs';
import { intentOf } from '$lib/server/features/intents/registry';
import { remember } from '$lib/server/features/memory/service';
import { timezoneOf } from '$lib/server/features/plan/context';
import { nextMonthStart, today } from '$lib/server/features/plan/dates';
import type { TasterInput } from './input';

type Platform = App.Platform | undefined;

export type TasterResult =
	| { status: 'kept'; intent: string; planning: 'generate' }
	| { status: 'parked'; until: string }
	| { status: 'let_go' }
	| { status: 'not_found' };

export async function decideAfterTasters(
	platform: Platform,
	userId: string,
	itemId: string,
	input: TasterInput
): Promise<TasterResult> {
	const found = await withDb(platform, async (db) => {
		const [item] = await db
			.select()
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)));
		return item ? { item, now: today(await timezoneOf(db, userId)) } : null;
	});
	if (!found) return { status: 'not_found' };
	const { item, now } = found;
	const why = input.note ? ` Why: ${input.note.slice(0, 300)}` : '';

	if (input.choice === 'keep') {
		const intent = input.intent ?? 'learn';
		await withDb(platform, (db) =>
			db
				.update(items)
				// The try-it-out goal ("decide whether…") is done; the full plan suggests new goals.
				.set({ intent, goal: null, intentConfirmedAt: new Date(), lastActiveAt: new Date() })
				.where(eq(items.id, item.id))
		);
		// A fresh, full plan replaces the tasters.
		await enqueue(platform, 'roadmap', { itemId: item.id, mode: 'generate' });
		await note(
			platform,
			userId,
			item.id,
			'plan_change',
			`Tried "${item.title}" and is keeping it: now a plan to ${intentOf(intent).label.toLowerCase()}.${why}`
		);
		return { status: 'kept', intent, planning: 'generate' };
	}

	if (input.choice === 'park') {
		const until = input.until ?? nextMonthStart(now);
		await withDb(platform, (db) =>
			db.update(items).set({ status: 'shortlist', parkedUntil: until }).where(eq(items.id, item.id))
		);
		await note(
			platform,
			userId,
			item.id,
			'idea_parked',
			`Tried "${item.title}" and parked it until ${until}.${why}`
		);
		return { status: 'parked', until };
	}

	await withDb(platform, (db) =>
		db.update(items).set({ status: 'archived' }).where(eq(items.id, item.id))
	);
	await note(
		platform,
		userId,
		item.id,
		'lesson_learned',
		`Tried "${item.title}" and let it go.${why}`
	);
	return { status: 'let_go' };
}

function note(
	platform: Platform,
	userId: string,
	itemId: string,
	type: 'plan_change' | 'idea_parked' | 'lesson_learned',
	summary: string
) {
	return remember(platform, userId, { type, summary, sourceType: 'item', sourceId: itemId }).catch(
		(e) => console.error('[tasters] remember failed', e)
	);
}
