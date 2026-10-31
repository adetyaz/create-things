/**
 * Credits: the daily free quota first, then bought credits. Reserved atomically before an AI call
 * and refunded if it fails. Every change to bought credits is a row in the append-only ledger.
 */
import { dev } from '$app/environment';
import { and, eq, gte, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { aiUsageDaily, creditBalances, creditLedger } from '$lib/server/db/schema';
import { optionalEnv } from '$lib/server/platform/env';
import {
	DEFAULT_FREE_DAILY_CREDITS,
	LOCAL_FREE_DAILY_CREDITS,
	costOf,
	freeQuotaApplies,
	quotaDay,
	type AiAction,
	type Tier
} from './pricing';

type Platform = App.Platform | undefined;

export class OutOfCreditsError extends Error {
	constructor(readonly cost: number) {
		super(`Out of free AI for today and not enough credits (needs ${cost})`);
	}
}

export interface Reservation {
	userId: string;
	action: AiAction;
	cost: number;
	source: 'free' | 'credits';
	day: string;
	ref?: string;
}

/**
 * FREE_DAILY_CREDITS if set; otherwise generous when running locally (development uses free AI, so
 * the meter shouldn't block testing) and the real default in production.
 */
export function freeDailyCredits(): number {
	const configured = optionalEnv('FREE_DAILY_CREDITS');
	if (configured !== undefined) {
		const value = Number(configured);
		if (Number.isFinite(value) && value >= 0) return value;
	}
	const local = dev || optionalEnv('LOCAL_DEV') === 'true';
	return local ? LOCAL_FREE_DAILY_CREDITS : DEFAULT_FREE_DAILY_CREDITS;
}

/** Takes the cost from today's free quota, or else from bought credits. Throws OutOfCreditsError. */
export async function reserveCredits(
	platform: Platform,
	userId: string,
	action: AiAction,
	options: { tier?: Tier; ref?: string } = {}
): Promise<Reservation> {
	const tier = options.tier ?? 'basic';
	const cost = costOf(action, tier);
	const day = quotaDay();
	const free = freeDailyCredits();

	return withDb(platform, (db) =>
		db.transaction(async (tx) => {
			if (freeQuotaApplies(tier) && cost <= free) {
				// One statement, so two requests can't both take the last free credits.
				const used = await tx
					.insert(aiUsageDaily)
					.values({ userId, day, freeUsed: cost })
					.onConflictDoUpdate({
						target: [aiUsageDaily.userId, aiUsageDaily.day],
						set: { freeUsed: sql`${aiUsageDaily.freeUsed} + ${cost}` },
						setWhere: sql`${aiUsageDaily.freeUsed} + ${cost} <= ${free}`
					})
					.returning({ freeUsed: aiUsageDaily.freeUsed });
				if (used.length > 0) return { userId, action, cost, source: 'free', day, ref: options.ref };
			}

			const spent = await tx
				.update(creditBalances)
				.set({ balance: sql`${creditBalances.balance} - ${cost}`, updatedAt: new Date() })
				.where(and(eq(creditBalances.userId, userId), gte(creditBalances.balance, cost)))
				.returning({ balance: creditBalances.balance });
			if (spent.length === 0) throw new OutOfCreditsError(cost);

			await tx
				.insert(creditLedger)
				.values({ userId, delta: -cost, reason: 'spend', ref: options.ref ?? action });
			return { userId, action, cost, source: 'credits', day, ref: options.ref };
		})
	);
}

/** Gives a reservation back after the AI call failed. */
export async function refundCredits(platform: Platform, reservation: Reservation): Promise<void> {
	const { userId, cost, day } = reservation;
	await withDb(platform, async (db) => {
		if (reservation.source === 'free') {
			await db
				.update(aiUsageDaily)
				.set({ freeUsed: sql`greatest(${aiUsageDaily.freeUsed} - ${cost}, 0)` })
				.where(and(eq(aiUsageDaily.userId, userId), eq(aiUsageDaily.day, day)));
			return;
		}
		await db.transaction(async (tx) => {
			await tx
				.update(creditBalances)
				.set({ balance: sql`${creditBalances.balance} + ${cost}`, updatedAt: new Date() })
				.where(eq(creditBalances.userId, userId));
			await tx.insert(creditLedger).values({
				userId,
				delta: cost,
				reason: 'refund',
				ref: reservation.ref ?? reservation.action
			});
		});
	});
}

/** Reserves, runs `work`, and refunds if `work` throws. */
export async function withCredits<T>(
	platform: Platform,
	userId: string,
	action: AiAction,
	work: () => Promise<T>,
	options: { tier?: Tier; ref?: string } = {}
): Promise<T> {
	const reservation = await reserveCredits(platform, userId, action, options);
	try {
		return await work();
	} catch (e) {
		await refundCredits(platform, reservation).catch((refundError) =>
			console.error('[credits] refund failed', reservation, refundError)
		);
		throw e;
	}
}

/** Adds bought or granted credits (purchases later; a dev route for testing now). */
export async function grantCredits(
	platform: Platform,
	userId: string,
	amount: number,
	reason: 'grant' | 'purchase',
	ref: string
): Promise<number> {
	if (!Number.isInteger(amount) || amount <= 0)
		throw new Error('amount must be a positive integer');
	return withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const [row] = await tx
				.insert(creditBalances)
				.values({ userId, balance: amount })
				.onConflictDoUpdate({
					target: creditBalances.userId,
					set: { balance: sql`${creditBalances.balance} + ${amount}`, updatedAt: new Date() }
				})
				.returning({ balance: creditBalances.balance });
			await tx.insert(creditLedger).values({ userId, delta: amount, reason, ref });
			return row.balance;
		})
	);
}

export interface CreditSummary {
	balance: number;
	freeDaily: number;
	freeUsedToday: number;
	freeLeftToday: number;
	day: string;
}

export function getCreditSummary(platform: Platform, userId: string): Promise<CreditSummary> {
	const day = quotaDay();
	const freeDaily = freeDailyCredits();
	return withDb(platform, async (db) => {
		const [balance] = await db
			.select({ balance: creditBalances.balance })
			.from(creditBalances)
			.where(eq(creditBalances.userId, userId));
		const [usage] = await db
			.select({ freeUsed: aiUsageDaily.freeUsed })
			.from(aiUsageDaily)
			.where(and(eq(aiUsageDaily.userId, userId), eq(aiUsageDaily.day, day)));
		const freeUsedToday = usage?.freeUsed ?? 0;
		return {
			balance: balance?.balance ?? 0,
			freeDaily,
			freeUsedToday,
			freeLeftToday: Math.max(freeDaily - freeUsedToday, 0),
			day
		};
	});
}
