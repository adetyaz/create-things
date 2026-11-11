/**
 * "Tell me about it": what the user says about a thing before it's planned (a course's units and
 * exam date, a website's purpose and deadline, a habit's rhythm…). Free: no AI.
 *
 * Stored without a schema change: the goal and date go in the item's own fields (the roadmap
 * already sizes the plan to them), a course's typed units become its course units (one milestone
 * each), and the rest is kept in the item's note under ABOUT_MARK, which the roadmap prompt reads
 * as "What they told you".
 */
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { withDb } from '$lib/server/db';
import { courseUnits, items } from '$lib/server/db/schema';

export const ABOUT_MARK = 'About it (from you):';

export const aboutInput = z.object({
	goal: z.string().trim().min(3).max(200).optional(),
	targetDate: z.iso.date().nullable().optional(),
	/** Plain answers, each "Question: answer". */
	answers: z
		.array(z.object({ q: z.string().trim().min(1).max(80), a: z.string().trim().min(1).max(500) }))
		.max(10)
		.default([]),
	/** A course's units, typed in order (one per line in the form). */
	units: z.array(z.string().trim().min(1).max(200)).max(40).optional()
});
export type AboutInput = z.infer<typeof aboutInput>;

/** The user's own answers, from an item's note (null when none were given). */
export function aboutOf(note: string | null): string | null {
	if (!note) return null;
	const i = note.indexOf(ABOUT_MARK);
	return i < 0 ? null : note.slice(i + ABOUT_MARK.length).trim() || null;
}

export async function saveAbout(
	platform: App.Platform | undefined,
	userId: string,
	itemId: string,
	input: AboutInput
): Promise<{ status: 'saved'; units: number } | { status: 'not_found' }> {
	return withDb(platform, async (db) => {
		const [item] = await db
			.select({ id: items.id, note: items.note })
			.from(items)
			.where(and(eq(items.id, itemId), eq(items.userId, userId)));
		if (!item) return { status: 'not_found' as const };

		const before = item.note?.split(ABOUT_MARK)[0].trim() ?? '';
		const about = input.answers.map((x) => `${x.q}: ${x.a}`).join('. ');
		const note = about ? `${before ? `${before}\n\n` : ''}${ABOUT_MARK} ${about}` : before || null;

		await db
			.update(items)
			.set({
				note,
				...(input.goal !== undefined && { goal: input.goal }),
				...(input.targetDate !== undefined && { targetDate: input.targetDate }),
				// Answering confirms what it is, so Start plans it straight away.
				intentConfirmedAt: new Date()
			})
			.where(eq(items.id, itemId));

		if (input.units?.length) {
			await db.delete(courseUnits).where(eq(courseUnits.itemId, itemId));
			await db
				.insert(courseUnits)
				.values(input.units.map((title, position) => ({ itemId, position, title })));
		}
		return { status: 'saved' as const, units: input.units?.length ?? 0 };
	});
}
