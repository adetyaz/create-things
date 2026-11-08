/**
 * The weekly digest (design PRD C22): the last 7 days, focused time and sessions first, then steps
 * done, blocks kept and moved, check-ins, what the pet ate, in identity language ("12 sessions:
 * you're someone who designs now"). Encouraging when the week was empty. Free: no AI.
 */
import { and, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import {
	items,
	journalEntries,
	petFeeds,
	pets,
	planSlots,
	pomodoroSessions,
	roadmaps,
	roadmapSteps,
	userSettings
} from '$lib/server/db/schema';
import { addDays } from '$lib/server/features/plan/dates';
import { localNow, zonedTime } from '$lib/server/features/reminders/clock';

type Platform = App.Platform | undefined;

/** Who they're becoming, by their first user type (template id). */
const IDENTITY: Record<string, string> = {
	crafts: 'makes things',
	photography: 'shoots every week',
	art: 'draws',
	designer: 'designs',
	music: 'practises music',
	writing: 'writes',
	concept: 'learns things properly',
	course: 'keeps up with the course',
	exam: 'is getting ready for the exam',
	language: 'is learning a language',
	habit: 'shows up',
	garden: 'tends a garden',
	explorer: 'tries things',
	custom: 'does the work'
};

export interface WeekDigest {
	from: string;
	to: string;
	focus: { minutes: number; sessions: number };
	steps: { done: number; titles: string[] };
	blocks: { planned: number; kept: number; moved: number };
	journal: { entries: number; checkIns: number };
	pet: { name: string | null; meals: number; ate: number };
	finished: string[];
	/** One line, identity first; the headline in reminders and email. */
	headline: string;
	/** A few short lines for the digest card. */
	lines: string[];
}

export async function weekDigest(
	platform: Platform,
	userId: string,
	endDay?: string
): Promise<WeekDigest> {
	return withDb(platform, async (db) => {
		const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
		const zone = settings?.timezone ?? 'UTC';
		const to = endDay ?? localNow(zone).day;
		const from = addDays(to, -6);
		const start = zonedTime(from, '00:00', zone);
		const end = zonedTime(addDays(to, 1), '00:00', zone);

		const sessions = await db
			.select({ startedAt: pomodoroSessions.startedAt, endedAt: pomodoroSessions.endedAt })
			.from(pomodoroSessions)
			.where(
				and(
					eq(pomodoroSessions.userId, userId),
					gte(pomodoroSessions.startedAt, start),
					lt(pomodoroSessions.startedAt, end),
					isNotNull(pomodoroSessions.endedAt)
				)
			);
		const counted = sessions
			.map((s) => Math.floor((s.endedAt!.getTime() - s.startedAt.getTime()) / 60_000))
			.filter((m) => m >= 10);

		const steps = await db
			.select({ title: roadmapSteps.title, minutes: roadmapSteps.minutes })
			.from(roadmapSteps)
			.innerJoin(roadmaps, eq(roadmaps.id, roadmapSteps.roadmapId))
			.innerJoin(items, eq(items.id, roadmaps.itemId))
			.where(
				and(eq(items.userId, userId), gte(roadmapSteps.doneAt, start), lt(roadmapSteps.doneAt, end))
			);

		const slots = await db
			.select({ missedAt: planSlots.missedAt, doneAt: roadmapSteps.doneAt })
			.from(planSlots)
			.innerJoin(roadmapSteps, eq(roadmapSteps.id, planSlots.stepId))
			.where(
				and(
					eq(planSlots.userId, userId),
					gte(planSlots.day, from),
					lt(planSlots.day, addDays(to, 1))
				)
			);

		const [journal] = await db
			.select({
				entries: sql<number>`count(*) filter (where ${journalEntries.kind} = 'entry')::int`,
				checkIns: sql<number>`count(*) filter (where ${journalEntries.kind} = 'check_in')::int`
			})
			.from(journalEntries)
			.where(
				and(
					eq(journalEntries.userId, userId),
					gte(journalEntries.createdAt, start),
					lt(journalEntries.createdAt, end)
				)
			);

		const [pet] = await db
			.select({ name: pets.name, id: pets.id })
			.from(pets)
			.where(eq(pets.userId, userId))
			.orderBy(sql`${pets.bornAt} desc`)
			.limit(1);
		const feeds = pet
			? await db
					.select({ size: petFeeds.size })
					.from(petFeeds)
					.where(
						and(
							eq(petFeeds.petId, pet.id),
							gte(petFeeds.createdAt, start),
							lt(petFeeds.createdAt, end)
						)
					)
			: [];

		const finished = await db
			.select({ title: items.title })
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					eq(items.status, 'done'),
					gte(items.lastActiveAt, start),
					lt(items.lastActiveAt, end)
				)
			);

		// Focused time: real sessions, or the steps' own minutes when no timer was used.
		const minutes = counted.length
			? counted.reduce((a, b) => a + b, 0)
			: steps.reduce((a, s) => a + (s.minutes ?? 0), 0);
		const sessionCount = counted.length || steps.length;
		const kept = slots.filter((s) => s.doneAt).length;
		const moved = slots.filter((s) => s.missedAt && !s.doneAt).length;
		const who = IDENTITY[settings?.templates?.[0] ?? 'custom'] ?? IDENTITY.custom;
		const hours =
			minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} hours` : `${minutes} minutes`;

		const empty =
			sessionCount === 0 && (journal?.checkIns ?? 0) === 0 && (journal?.entries ?? 0) === 0;
		const headline = empty
			? 'A quiet week. That happens. One 2-minute step tomorrow gets things moving again.'
			: `${sessionCount} session${sessionCount === 1 ? '' : 's'}, ${hours} of focus: you're someone who ${who} now.`;
		const lines = empty
			? ['Nothing logged this week, and that is fine.', 'Plan the week: even one block counts.']
			: [
					`${steps.length} step${steps.length === 1 ? '' : 's'} done${
						steps.length
							? `: ${steps
									.slice(0, 3)
									.map((s) => s.title)
									.join('; ')}`
							: ''
					}.`,
					slots.length
						? `${kept} of ${slots.length} planned blocks kept${moved ? `, ${moved} moved` : ''}. Plans bent, not broken.`
						: 'No blocks planned this week: plan a few on Sunday.',
					`${journal?.checkIns ?? 0} check-in${journal?.checkIns === 1 ? '' : 's'} and ${journal?.entries ?? 0} journal entr${journal?.entries === 1 ? 'y' : 'ies'}.`,
					...(pet ? [`${pet.name} ate ${feeds.length} time${feeds.length === 1 ? '' : 's'}.`] : []),
					...(finished.length ? [`Finished: ${finished.map((f) => f.title).join(', ')}.`] : [])
				];

		return {
			from,
			to,
			focus: { minutes, sessions: sessionCount },
			steps: { done: steps.length, titles: steps.map((s) => s.title) },
			blocks: { planned: slots.length, kept, moved },
			journal: { entries: journal?.entries ?? 0, checkIns: journal?.checkIns ?? 0 },
			pet: {
				name: pet?.name ?? null,
				meals: feeds.length,
				ate: feeds.reduce((a, f) => a + ({ snack: 1, meal: 3, feast: 8 } as const)[f.size], 0)
			},
			finished: finished.map((f) => f.title),
			headline,
			lines
		};
	});
}
