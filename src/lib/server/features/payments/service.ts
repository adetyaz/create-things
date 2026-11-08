/**
 * Payments in USDC or SUI on Sui (H12–H13), confirmed by reading the transaction through Tatum:
 * the user sends the shown amount to the app's address (SUI_PAYMENT_ADDRESS) from their wallet,
 * then gives the transaction digest; credits arrive once it checks out. A transaction counts once.
 * A failed or unconfirmed payment never grants anything (design PRD C20).
 */
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { suiPayments } from '$lib/server/db/schema';
import { getExchangeRate, suiClient, type SuiNetwork } from '$lib/server/integrations/tatum';
import { grantCredits } from '$lib/server/features/credits/service';
import { optionalEnv } from '$lib/server/platform/env';
import {
	COINS,
	PACKS,
	PRO_ANSWER,
	packOf,
	rawAmount,
	sameAddress,
	sameCoin,
	type Coin
} from './packs';

type Platform = App.Platform | undefined;

/** A payment must be this recent to be claimed (stops old transfers being reused). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** SUI's price moves: accept this much below the quoted amount. */
const SUI_TOLERANCE = 0.03;

export function network(): SuiNetwork {
	return optionalEnv('SUI_NETWORK') === 'testnet' ? 'testnet' : 'mainnet';
}

/** What's for sale, where to pay, and how much in each coin. */
export async function paymentOptions() {
	const payTo = optionalEnv('SUI_PAYMENT_ADDRESS') ?? null;
	const rate = await getExchangeRate('SUI', 'USD').catch(() => null);
	const suiUsd = rate ? Number(rate.value) : undefined;
	const price = (usd: number) => ({
		usd,
		usdc: Number(rawAmount(usd, 'usdc')) / 10 ** COINS.usdc.decimals,
		sui: suiUsd ? Number(rawAmount(usd, 'sui', suiUsd)) / 10 ** COINS.sui.decimals : null
	});
	return {
		ready: !!payTo,
		payTo,
		network: network(),
		coins: { usdc: COINS.usdc.type, sui: COINS.sui.type },
		suiUsd: suiUsd ?? null,
		packs: PACKS.map((p) => ({ ...p, price: price(p.usd) })),
		proAnswer: { ...PRO_ANSWER, price: price(PRO_ANSWER.usd) },
		how: payTo
			? 'Send the amount to the address from your Sui wallet (USDC transfers on Sui need no gas), then paste the transaction digest.'
			: 'Payments are not set up yet (needs-input.md K6).'
	};
}

export type ConfirmResult =
	| { status: 'confirmed'; credits: number; balance: number; coin: Coin; explorerUrl: string }
	| { status: 'invalid'; message: string };

/** Checks a transaction on Sui (through Tatum) and grants the pack's credits once. */
export async function confirmPayment(
	platform: Platform,
	userId: string,
	input: { txDigest: string; pack: string }
): Promise<ConfirmResult> {
	const payTo = optionalEnv('SUI_PAYMENT_ADDRESS');
	if (!payTo) return { status: 'invalid', message: 'Payments are not set up yet' };
	const pack = packOf(input.pack);
	if (!pack) return { status: 'invalid', message: 'Unknown pack' };

	const [used] = await withDb(platform, (db) =>
		db
			.select({ id: suiPayments.id })
			.from(suiPayments)
			.where(eq(suiPayments.txDigest, input.txDigest))
	);
	if (used) return { status: 'invalid', message: 'That payment was already used' };

	let tx;
	try {
		tx = await suiClient(network()).getTransaction({
			digest: input.txDigest,
			include: { balanceChanges: true, effects: true }
		});
	} catch {
		return {
			status: 'invalid',
			message: "Couldn't find that transaction on Sui yet. Try again in a minute."
		};
	}
	const done = tx.Transaction;
	if (!done)
		return { status: 'invalid', message: 'That transaction failed on Sui, so nothing was charged' };
	if (done.timestampMs && Date.now() - Number(done.timestampMs) > MAX_AGE_MS) {
		return { status: 'invalid', message: 'That payment is older than a day' };
	}

	// What the app's address received, by coin.
	const received = (done.balanceChanges ?? []).filter(
		(c) => sameAddress(c.address, payTo) && BigInt(c.amount) > 0n
	);
	let coin: Coin | null = null;
	let amount = 0n;
	for (const c of received) {
		if (sameCoin(c.coinType, COINS.usdc.type)) {
			coin = 'usdc';
			amount = BigInt(c.amount);
		} else if (sameCoin(c.coinType, COINS.sui.type) && !coin) {
			coin = 'sui';
			amount = BigInt(c.amount);
		}
	}
	if (!coin)
		return {
			status: 'invalid',
			message: "That transaction didn't send USDC or SUI to createthings"
		};

	let needed: bigint;
	if (coin === 'usdc') {
		needed = rawAmount(pack.usd, 'usdc');
	} else {
		const rate = await getExchangeRate('SUI', 'USD');
		needed = BigInt(
			Math.floor(Number(rawAmount(pack.usd, 'sui', Number(rate.value))) * (1 - SUI_TOLERANCE))
		);
	}
	if (amount < needed) {
		return { status: 'invalid', message: `That payment is less than ${pack.label} costs` };
	}

	// Record first (the digest is unique), so a double submit can't grant twice.
	const recorded = await withDb(platform, (db) =>
		db
			.insert(suiPayments)
			.values({
				userId,
				txDigest: input.txDigest,
				amount,
				coin,
				purpose: pack.id === PRO_ANSWER.id ? 'request' : 'credits',
				confirmedAt: new Date()
			})
			.onConflictDoNothing()
			.returning({ id: suiPayments.id })
	);
	if (!recorded.length) return { status: 'invalid', message: 'That payment was already used' };
	const balance = await grantCredits(
		platform,
		userId,
		pack.credits,
		'purchase',
		`sui:${input.txDigest}`
	);
	const explorer =
		network() === 'testnet' ? 'https://suiscan.xyz/testnet' : 'https://suiscan.xyz/mainnet';
	return {
		status: 'confirmed',
		credits: pack.credits,
		balance,
		coin,
		explorerUrl: `${explorer}/tx/${input.txDigest}`
	};
}

/** The user's payments, newest first. */
export function paymentsOf(platform: Platform, userId: string) {
	return withDb(platform, (db) =>
		db
			.select({
				txDigest: suiPayments.txDigest,
				coin: suiPayments.coin,
				purpose: suiPayments.purpose,
				amount: suiPayments.amount,
				confirmedAt: suiPayments.confirmedAt
			})
			.from(suiPayments)
			.where(eq(suiPayments.userId, userId))
	).then((rows) => rows.map((r) => ({ ...r, amount: r.amount.toString() })));
}
