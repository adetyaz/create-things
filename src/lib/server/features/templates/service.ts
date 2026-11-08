/**
 * The user's templates and rhythm: applied in onboarding, editable in Settings → Your rhythm, and
 * overridable per goal. Changing a template never deletes anything (design PRD B10).
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, userSettings } from '$lib/server/db/schema';
import { DEFAULT_RHYTHM, describeRhythm, rhythmSchema, type Rhythm } from './rhythm';
import { summaryOf, templateOf, TEMPLATES, type Template } from './registry';

type Platform = App.Platform | undefined;

/** Pet leniency presets: days until it runs away / dies (minimums 10 and 21). */
export const LENIENCY = {
	gentle: { runawayDays: 30, deathDays: 60 },
	firm: { runawayDays: 21, deathDays: 42 }
} as const;
export type Leniency = keyof typeof LENIENCY;

const WEEKDAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
];

export interface RhythmView {
	templates: { id: string; label: string; journalPrompt: string }[];
	rhythm: Rhythm;
	rhythmText: string;
	reviews: { on: boolean; cap: number };
	hungerMode: 'days' | 'check_ins';
	pet: { runawayDays: number; deathDays: number; restUntil: Date | null };
	/** The whole setup in plain words (onboarding step 3, Settings → Your rhythm). */
	summary: string;
}

export async function getRhythm(platform: Platform, userId: string): Promise<RhythmView> {
	const [row] = await withDb(platform, (db) =>
		db.select().from(userSettings).where(eq(userSettings.userId, userId))
	);
	const chosen = (row?.templates ?? [])
		.map((id) => templateOf(id))
		.filter((t): t is Template => !!t);
	const templates = chosen.length ? chosen : [templateOf('explorer')!];
	const rhythm = rhythmSchema.safeParse(row?.rhythm).data ?? templates[0].rhythm ?? DEFAULT_RHYTHM;
	const cap = row?.dailyReviewCap ?? 5;
	const rhythmText = describeRhythm(rhythm);
	return {
		templates: templates.map((t) => ({ id: t.id, label: t.label, journalPrompt: t.journalPrompt })),
		rhythm,
		rhythmText,
		reviews: { on: cap > 0, cap },
		hungerMode: row?.hungerMode === 'check_ins' ? 'check_ins' : 'days',
		pet: {
			runawayDays: row?.runawayDays ?? 30,
			deathDays: row?.deathDays ?? 60,
			restUntil: row?.restUntil ?? null
		},
		summary: summaryOf(templates, rhythmText, WEEKDAY_NAMES[row?.weeklyPlanDay ?? 0])
	};
}

export interface RhythmUpdate {
	templates?: string[];
	rhythm?: Rhythm;
	reviews?: { on: boolean; cap?: number };
	hungerMode?: 'days' | 'check_ins';
	leniency?: Leniency;
}

/**
 * Applies templates and choices. Picking templates fills in their rhythm and reviews unless those
 * are given too. The pet's timeline can be made more lenient any time; stricter at most once a
 * month (Breakdown §10), which the caller learns from `timelineHeld`.
 */
export async function setRhythm(
	platform: Platform,
	userId: string,
	update: RhythmUpdate
): Promise<RhythmView & { timelineHeld: boolean }> {
	const picked = (update.templates ?? []).map(templateOf).filter((t): t is Template => !!t);
	const values: Partial<typeof userSettings.$inferInsert> = {};
	if (picked.length) {
		values.templates = picked.map((t) => t.id);
		values.rhythm = update.rhythm ?? picked[0].rhythm;
		const reviewsOn = picked.some((t) => t.reviews.on);
		values.dailyReviewCap = reviewsOn ? Math.max(...picked.map((t) => t.reviews.cap)) : 0;
	}
	if (update.rhythm) values.rhythm = update.rhythm;
	if (update.reviews) values.dailyReviewCap = update.reviews.on ? (update.reviews.cap ?? 5) : 0;
	if (update.hungerMode) values.hungerMode = update.hungerMode;

	let timelineHeld = false;
	if (update.leniency) {
		const target = LENIENCY[update.leniency];
		const [row] = await withDb(platform, (db) =>
			db.select().from(userSettings).where(eq(userSettings.userId, userId))
		);
		const stricter = (row?.runawayDays ?? 30) > target.runawayDays;
		const changedRecently =
			row?.timelineChangedAt &&
			Date.now() - row.timelineChangedAt.getTime() < 30 * 24 * 60 * 60 * 1000;
		if (stricter && changedRecently) timelineHeld = true;
		else Object.assign(values, target, { timelineChangedAt: new Date() });
	}

	if (Object.keys(values).length) {
		await withDb(platform, (db) =>
			db
				.insert(userSettings)
				.values({ userId, ...values })
				.onConflictDoUpdate({ target: userSettings.userId, set: values })
		);
	}
	return { ...(await getRhythm(platform, userId)), timelineHeld };
}

/** A goal's own rhythm ("jewelry every 2 days, cloud cert daily"); null goes back to yours. */
export async function setItemRhythm(
	platform: Platform,
	userId: string,
	itemId: string,
	rhythm: Rhythm | null
): Promise<boolean> {
	const rows = await withDb(platform, (db) =>
		db
			.update(items)
			.set({ rhythm })
			.where(and(eq(items.id, itemId), eq(items.userId, userId)))
			.returning({ id: items.id })
	);
	return rows.length > 0;
}

/** Rest mode: hunger pauses until a day (holidays, sick days), or ends now with null. */
export async function setRest(platform: Platform, userId: string, until: string | null) {
	const restUntil = until ? new Date(`${until}T23:59:59Z`) : null;
	await withDb(platform, (db) =>
		db
			.insert(userSettings)
			.values({ userId, restUntil })
			.onConflictDoUpdate({ target: userSettings.userId, set: { restUntil } })
	);
	return { restUntil };
}

export function templateList() {
	return TEMPLATES;
}
