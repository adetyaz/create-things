/**
 * Experiments: each user's variant (placed by a stable hash of their id, so it never changes),
 * outcome events, and the results per variant. No third-party tracking.
 */
import { and, eq, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { experimentAssignments, productEvents } from '$lib/server/db/schema';
import { EXPERIMENTS, experimentOf, OUTCOMES } from './registry';

type Platform = App.Platform | undefined;

/** A stable number 0…n-1 for this user and experiment (FNV-1a; no crypto needed). */
export function placement(userId: string, experimentId: string, n: number): number {
	let hash = 0x811c9dc5;
	for (const ch of `${experimentId}:${userId}`) {
		hash ^= ch.charCodeAt(0);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash % n;
}

/** The user's variant for an experiment (saved the first time it's asked). */
export async function variantFor(
	platform: Platform,
	userId: string,
	experimentId: string
): Promise<string> {
	const experiment = experimentOf(experimentId);
	if (!experiment) throw new Error(`Unknown experiment ${experimentId}`);
	return withDb(platform, async (db) => {
		const [saved] = await db
			.select({ variant: experimentAssignments.variant })
			.from(experimentAssignments)
			.where(
				and(
					eq(experimentAssignments.userId, userId),
					eq(experimentAssignments.experiment, experimentId)
				)
			);
		if (saved && experiment.variants.includes(saved.variant)) return saved.variant;
		const variant =
			experiment.variants[placement(userId, experimentId, experiment.variants.length)];
		await db
			.insert(experimentAssignments)
			.values({ userId, experiment: experimentId, variant })
			.onConflictDoUpdate({
				target: [experimentAssignments.userId, experimentAssignments.experiment],
				set: { variant }
			});
		return variant;
	});
}

/** All of the user's variants. */
export async function variantsOf(platform: Platform, userId: string) {
	const out: Record<string, string> = {};
	for (const e of EXPERIMENTS) out[e.id] = await variantFor(platform, userId, e.id);
	return out;
}

/** Try a variant by hand (dev, and until sign-in brings real users). */
export async function forceVariant(
	platform: Platform,
	userId: string,
	experimentId: string,
	variant: string
): Promise<boolean> {
	if (!experimentOf(experimentId)?.variants.includes(variant)) return false;
	await withDb(platform, (db) =>
		db
			.insert(experimentAssignments)
			.values({ userId, experiment: experimentId, variant })
			.onConflictDoUpdate({
				target: [experimentAssignments.userId, experimentAssignments.experiment],
				set: { variant }
			})
	);
	return true;
}

/** Records an outcome event. Never fails the caller. */
export async function recordEvent(
	platform: Platform,
	userId: string,
	name: string,
	data?: Record<string, unknown>
): Promise<void> {
	await withDb(platform, (db) =>
		db.insert(productEvents).values({ userId, name, data: data ?? null })
	).catch((e) => console.error('[experiments] event failed', name, e));
}

/** Records an event only the first time (e.g. first_step_done). */
export async function recordFirst(platform: Platform, userId: string, name: string) {
	const [seen] = await withDb(platform, (db) =>
		db
			.select({ id: productEvents.id })
			.from(productEvents)
			.where(and(eq(productEvents.userId, userId), eq(productEvents.name, name)))
			.limit(1)
	).catch(() => [{ id: 'skip' }]);
	if (!seen) await recordEvent(platform, userId, name);
}

/** Per experiment and variant: users placed, and how many of them reached each outcome. */
export async function results(platform: Platform) {
	const rows = await withDb(platform, (db) =>
		db
			.select({
				experiment: experimentAssignments.experiment,
				variant: experimentAssignments.variant,
				users: sql<number>`count(distinct ${experimentAssignments.userId})::int`,
				...Object.fromEntries(
					OUTCOMES.map((o) => [
						o,
						sql<number>`count(distinct case when exists (select 1 from ${productEvents} pe where pe.user_id = ${experimentAssignments.userId} and pe.name = ${o}) then ${experimentAssignments.userId} end)::int`
					])
				)
			})
			.from(experimentAssignments)
			.groupBy(experimentAssignments.experiment, experimentAssignments.variant)
	);
	return EXPERIMENTS.map((e) => ({
		...e,
		variants: e.variants.map(
			(v) =>
				rows.find((r) => r.experiment === e.id && r.variant === v) ?? {
					experiment: e.id,
					variant: v,
					users: 0
				}
		)
	}));
}
