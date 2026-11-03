/**
 * The pet: adopting it, reading its mood (with why), and feeding it from real work. Its state lives
 * here; the UI only makes it visible. No AI and no Walrus calls: everything is free.
 */
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { withDb, type Db } from '$lib/server/db';
import { items, petFeeds, pets, roadmapSteps, userSettings } from '$lib/server/db/schema';
import { timezoneOf } from '$lib/server/features/plan/context';
import { today } from '$lib/server/features/plan/dates';
import { breedOf, speciesOf } from './species';
import {
	ago,
	DAILY_FOOD_LIMIT,
	DAYS_TO_COME_HOME,
	daysWithoutFood,
	FOOD_POINTS,
	fitsToday,
	moodFor,
	nextChange,
	type FoodSize,
	type Mood,
	type Timeline
} from './rules';
import type { AdoptInput } from './input';

type Platform = App.Platform | undefined;
type Pet = typeof pets.$inferSelect;

/** What feeds the pet, as stored in `pet_feeds.source_type` (dated ones count once a day). */
export type FeedSource =
	| { type: 'step'; id: string }
	| { type: 'item'; id: string }
	| { type: 'reviews'; day: string }
	| { type: 'quiz'; itemId: string; day: string };

export interface FeedLine {
	size: FoodSize;
	label: string;
	at: Date;
}

export interface PetView {
	pet: {
		id: string;
		name: string;
		species: string;
		breed: string;
		personality: string | null;
		food: string;
		growth: number;
		bornAt: Date;
	};
	mood: Mood;
	daysWithoutFood: number;
	/** Plain words for why it feels this way (principle 18). */
	why: string;
	/** "Gets peckish in 2 days", or null. */
	next: string | null;
	today: { eaten: number; limit: number; full: boolean };
	/** Only while it's away: days of activity done toward coming home. */
	comingHome: { done: number; needed: number } | null;
	history: FeedLine[];
}

const MOOD_WORDS: Record<Mood, string> = {
	happy: 'happy',
	peckish: 'peckish',
	hungry: 'hungry',
	starving: 'starving',
	ran_away: 'away',
	dead: 'gone',
	resting: 'resting'
};

async function settingsOf(db: Db, userId: string) {
	const [row] = await db
		.select({
			runawayDays: userSettings.runawayDays,
			deathDays: userSettings.deathDays,
			restUntil: userSettings.restUntil
		})
		.from(userSettings)
		.where(eq(userSettings.userId, userId));
	return row ?? { runawayDays: 30, deathDays: 60, restUntil: null };
}

/** The user's current pet: the newest one that hasn't died, else the newest. */
async function currentPet(db: Db, userId: string): Promise<Pet | null> {
	const [pet] = await db
		.select()
		.from(pets)
		.where(eq(pets.userId, userId))
		.orderBy(desc(pets.bornAt))
		.limit(1);
	return pet ?? null;
}

/** Saves a move to "ran away" or "died" the first time it's noticed (no nightly job needed). */
async function settleStatus(db: Db, pet: Pet, mood: Mood): Promise<Pet> {
	if (mood === 'dead' && pet.status !== 'dead') {
		const [updated] = await db
			.update(pets)
			.set({ status: 'dead', diedAt: new Date() })
			.where(eq(pets.id, pet.id))
			.returning();
		return updated;
	}
	if (mood === 'ran_away' && pet.status === 'alive') {
		const [updated] = await db
			.update(pets)
			.set({ status: 'ran_away', returningDays: 0 })
			.where(eq(pets.id, pet.id))
			.returning();
		return updated;
	}
	return pet;
}

/** The mood as stored and as worked out: a pet that ran away stays away until it comes home. */
function moodOf(pet: Pet, timeline: Timeline, restUntil: Date | null, now: Date) {
	const days = daysWithoutFood(pet.lastFedAt, restUntil, now);
	const resting = !!restUntil && restUntil > now;
	if (pet.status === 'dead') return { days, mood: 'dead' as Mood };
	const worked = moodFor(days, timeline, resting);
	if (pet.status === 'ran_away' && worked !== 'dead' && worked !== 'resting') {
		return { days, mood: 'ran_away' as Mood };
	}
	return { days, mood: worked };
}

/** Adopts a pet. Null when one is still alive or away (one pet at a time). */
export async function adoptPet(
	platform: Platform,
	userId: string,
	input: AdoptInput
): Promise<PetView | null> {
	const created = await withDb(platform, async (db) => {
		const [living] = await db
			.select({ id: pets.id })
			.from(pets)
			.where(and(eq(pets.userId, userId), ne(pets.status, 'dead')))
			.limit(1);
		if (living) return null;
		const [pet] = await db
			.insert(pets)
			.values({ userId, species: input.species, breed: input.breed, name: input.name })
			.returning();
		return pet;
	});
	return created ? getPet(platform, userId) : null;
}

/** The pet with its mood, why, what's next, today's food and its feed history. Null: no pet yet. */
export async function getPet(platform: Platform, userId: string): Promise<PetView | null> {
	return withDb(platform, async (db) => {
		let pet = await currentPet(db, userId);
		if (!pet) return null;
		const settings = await settingsOf(db, userId);
		const now = new Date();
		const { days, mood } = moodOf(pet, settings, settings.restUntil, now);
		pet = await settleStatus(db, pet, mood);

		const day = today(await timezoneOf(db, userId), now);
		const eaten = pet.foodTodayDate === day ? pet.foodToday : 0;
		const history = await historyOf(db, pet.id);
		const species = speciesOf(pet.species);
		const breed = breedOf(pet.species, pet.breed);
		const change = mood === 'resting' || mood === 'ran_away' ? null : nextChange(days, settings);

		return {
			pet: {
				id: pet.id,
				name: pet.name,
				species: pet.species,
				breed: pet.breed,
				personality: breed?.personality ?? null,
				food: species?.food ?? 'food',
				growth: pet.growth,
				bornAt: pet.bornAt
			},
			mood,
			daysWithoutFood: days,
			why: whyText(pet, mood, days, history[0], settings.restUntil),
			next:
				change && mood !== 'dead'
					? `Gets ${MOOD_WORDS[change.mood]} in ${change.inDays} day${change.inDays === 1 ? '' : 's'} without food`
					: null,
			today: { eaten, limit: DAILY_FOOD_LIMIT, full: eaten >= DAILY_FOOD_LIMIT },
			comingHome:
				mood === 'ran_away' ? { done: pet.returningDays, needed: DAYS_TO_COME_HOME } : null,
			history
		};
	});
}

function whyText(
	pet: Pet,
	mood: Mood,
	days: number,
	last: FeedLine | undefined,
	restUntil: Date | null
): string {
	const lastMeal = last ? ` (${last.label.charAt(0).toLowerCase()}${last.label.slice(1)})` : '';
	switch (mood) {
		case 'resting':
			return `${pet.name} is resting until ${restUntil?.toISOString().slice(0, 10)}. Hunger is paused.`;
		case 'ran_away': {
			const left = DAYS_TO_COME_HOME - pet.returningDays;
			return `${pet.name} ran away after ${days} days without food. ${left} more day${left === 1 ? '' : 's'} of real work bring${left === 1 ? 's' : ''} ${pet.name} home.`;
		}
		case 'dead':
			return `${pet.name} died after ${days} days without food. Revive, or earn a new egg with about a week of work.`;
		default:
			// A new pet hasn't eaten yet: say how to feed it instead of "last fed today".
			if (last) return `Last fed ${ago(days)}${lastMeal}.`;
			return `${pet.name} hasn't eaten ${days === 0 ? 'yet' : `since arriving ${ago(days)}`}. Finish a step, today's reviews or a quiz to feed ${pet.name}.`;
	}
}

/** The last meals, newest first, in plain words ("Step done: Sketch the layout"). */
async function historyOf(db: Db, petId: string, limit = 10): Promise<FeedLine[]> {
	const feeds = await db
		.select()
		.from(petFeeds)
		.where(eq(petFeeds.petId, petId))
		.orderBy(desc(petFeeds.createdAt))
		.limit(limit);
	const stepIds = feeds.filter((f) => f.sourceType === 'step').map((f) => f.sourceId);
	const itemIds = feeds
		.filter((f) => f.sourceType === 'item' || f.sourceType.startsWith('quiz:'))
		.map((f) => f.sourceId);
	const steps = stepIds.length
		? await db
				.select({ id: roadmapSteps.id, title: roadmapSteps.title })
				.from(roadmapSteps)
				.where(inArray(roadmapSteps.id, stepIds))
		: [];
	const found = itemIds.length
		? await db
				.select({ id: items.id, title: items.title })
				.from(items)
				.where(inArray(items.id, itemIds))
		: [];
	const title = (rows: { id: string; title: string }[], id: string) =>
		rows.find((r) => r.id === id)?.title ?? 'something';
	return feeds.map((f) => ({
		size: f.size,
		at: f.createdAt,
		label:
			f.sourceType === 'step'
				? `Step done: ${title(steps, f.sourceId)}`
				: f.sourceType === 'item'
					? `Finished: ${title(found, f.sourceId)}`
					: f.sourceType.startsWith('quiz:')
						? `Practice quiz: ${title(found, f.sourceId)}`
						: f.sourceType.startsWith('reviews:')
							? "Finished today's reviews"
							: f.sourceType
	}));
}

export type FeedResult =
	| { status: 'fed'; size: FoodSize; name: string; eatenToday: number }
	| { status: 'full'; name: string }
	| { status: 'coming_home'; name: string; done: number; needed: number; home: boolean }
	| { status: 'already' | 'no_pet' | 'dead' };

/**
 * Feeds the pet for one piece of real work. Each source feeds once (a step done twice still counts
 * once); the daily limit holds; a pet that ran away counts it toward coming home. Never throws for
 * the caller's sake: feeding must never break the action that earned it.
 */
export async function feedPet(
	platform: Platform,
	userId: string,
	source: FeedSource,
	size: FoodSize
): Promise<FeedResult> {
	const [sourceType, sourceId] = sourceKey(source);
	return withDb(platform, async (db) => {
		let pet = await currentPet(db, userId);
		if (!pet) return { status: 'no_pet' };
		const settings = await settingsOf(db, userId);
		const now = new Date();
		const { mood } = moodOf(pet, settings, settings.restUntil, now);
		pet = await settleStatus(db, pet, mood);
		if (pet.status === 'dead') return { status: 'dead' };

		const day = today(await timezoneOf(db, userId), now);
		const eaten = pet.foodTodayDate === day ? pet.foodToday : 0;
		const petId = pet.id;
		const recorded = await db
			.insert(petFeeds)
			.values({ petId, sourceType, sourceId: sourceId ?? petId, size })
			.onConflictDoNothing()
			.returning({ id: petFeeds.id });
		if (!recorded.length) return { status: 'already' };

		if (pet.status === 'ran_away') {
			// One count per day of real work; the third brings it home, fed.
			const newDay = pet.foodTodayDate !== day;
			const done = pet.returningDays + (newDay ? 1 : 0);
			const home = done >= DAYS_TO_COME_HOME;
			await db
				.update(pets)
				.set(
					home
						? {
								status: 'alive',
								returningDays: 0,
								lastFedAt: now,
								foodToday: 0,
								foodTodayDate: day
							}
						: { returningDays: done, foodTodayDate: day }
				)
				.where(eq(pets.id, petId));
			return { status: 'coming_home', name: pet.name, done, needed: DAYS_TO_COME_HOME, home };
		}

		if (!fitsToday(eaten, size)) {
			// Over the limit: the work still counts in the history, but the pet is full.
			return { status: 'full', name: pet.name };
		}
		const eatenToday = eaten + FOOD_POINTS[size];
		await db
			.update(pets)
			.set({
				lastFedAt: now,
				growth: pet.growth + FOOD_POINTS[size],
				foodToday: eatenToday,
				foodTodayDate: day
			})
			.where(eq(pets.id, petId));
		return { status: 'fed', size, name: pet.name, eatenToday };
	});
}

/** `pet_feeds` keys: dated sources include the day, so they feed once a day. */
function sourceKey(source: FeedSource): [string, string | null] {
	switch (source.type) {
		case 'step':
		case 'item':
			return [source.type, source.id];
		case 'reviews':
			return [`reviews:${source.day}`, null];
		case 'quiz':
			return [`quiz:${source.day}`, source.itemId];
	}
}

/** Feeds without ever failing the caller (logs instead). */
export function feedQuietly(
	platform: Platform,
	userId: string,
	source: FeedSource,
	size: FoodSize
): Promise<FeedResult | null> {
	return feedPet(platform, userId, source, size).catch((e) => {
		console.error('[pet] feed failed', source, e);
		return null;
	});
}

/** Today's date for the user, for dated feeds (reviews, quizzes). */
export function userToday(platform: Platform, userId: string): Promise<string> {
	return withDb(platform, async (db) => today(await timezoneOf(db, userId)));
}

/** Test and demo only (dev): pretend the last meal was `days` ago, to see the moods. */
export async function setLastFed(platform: Platform, userId: string, days: number) {
	return withDb(platform, async (db) => {
		const pet = await currentPet(db, userId);
		if (!pet) return null;
		await db
			.update(pets)
			.set({
				lastFedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
				status: 'alive',
				returningDays: 0,
				diedAt: null
			})
			.where(eq(pets.id, pet.id));
		return true;
	});
}
