/**
 * Payments on Sui without a wallet (H12–H13): each user has an app-made Sui account (accounts.ts);
 * buying a credit pack or a Pro answer moves USDC (or SUI on testnet) from it to the app's account,
 * with the app paying the gas (a sponsored transaction). The result is read back through Tatum
 * (succeeded, the right amount to the right address) before credits arrive; each counts once.
 */
import { eq } from 'drizzle-orm';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { withDb } from '$lib/server/db';
import { suiPayments } from '$lib/server/db/schema';
import { getExchangeRate } from '$lib/server/integrations/tatum';
import { grantCredits } from '$lib/server/features/credits/service';
import { PACKS, PRO_ANSWER, packOf, rawAmount, sameAddress, sameCoin } from './packs';
import { accountFor, accountView, balancesOf, keypairFor } from './accounts';
import { agentKeypair, explorer, network, publicNode, reader, SUI_TYPE, usdcType } from './network';

type Platform = App.Platform | undefined;
export type Coin = 'usdc' | 'sui';

async function suiUsd(): Promise<number | undefined> {
	const rate = await getExchangeRate('SUI', 'USD').catch(() => null);
	return rate ? Number(rate.value) : undefined;
}

/** What's for sale, prices in USDC and SUI, and the user's account (balances; address in details). */
export async function paymentOptions(platform: Platform, userId: string) {
	const rate = await suiUsd();
	const price = (usd: number) => ({
		usd,
		usdc: Number(rawAmount(usd, 'usdc')) / 1e6,
		sui: rate ? Number(rawAmount(usd, 'sui', rate)) / 1e9 : null
	});
	const ready = !!agentKeypair();
	return {
		ready,
		network: network(),
		suiUsd: rate ?? null,
		packs: PACKS.map((p) => ({ ...p, price: price(p.usd) })),
		proAnswer: { ...PRO_ANSWER, price: price(PRO_ANSWER.usd) },
		account: ready ? await accountView(platform, userId) : null,
		how: ready
			? network() === 'testnet'
				? 'Test mode: add free test funds, then buy. No wallet needed; the app pays the gas.'
				: 'Top up your account, then buy. No wallet needed; the app pays the gas.'
			: 'Payments are not set up yet (needs-input.md).'
	};
}

export type BuyResult =
	| { status: 'paid'; credits: number; balance: number; coin: Coin; explorerUrl: string }
	| { status: 'invalid'; message: string };

/**
 * Buys a pack from the user's account. Pays in USDC when there's enough, otherwise SUI at Tatum's
 * rate (or the coin asked for). Nothing is granted unless Sui confirms the payment.
 */
export async function buy(
	platform: Platform,
	userId: string,
	input: { pack: string; coin?: Coin }
): Promise<BuyResult> {
	const pack = packOf(input.pack);
	if (!pack) return { status: 'invalid', message: 'Unknown pack' };
	const agent = agentKeypair();
	if (!agent) return { status: 'invalid', message: 'Payments are not set up yet' };
	const { address } = await accountFor(platform, userId);
	const balances = await balancesOf(address);
	const rate = await suiUsd();

	const usdcNeeded = rawAmount(pack.usd, 'usdc');
	const coin: Coin = input.coin ?? (balances.usdc * 1e6 >= Number(usdcNeeded) ? 'usdc' : 'sui');
	const amount = coin === 'usdc' ? usdcNeeded : rawAmount(pack.usd, 'sui', rate);
	const have = coin === 'usdc' ? balances.usdc * 1e6 : balances.sui * 1e9;
	if (have < Number(amount)) {
		return {
			status: 'invalid',
			message:
				network() === 'testnet'
					? `Not enough ${coin.toUpperCase()} in your account: add test funds first`
					: `Not enough ${coin.toUpperCase()} in your account: top up first`
		};
	}

	// The user's account sends the payment; the app's account pays the gas.
	const tx = new Transaction();
	tx.setSender(address);
	tx.setGasOwner(agent.toSuiAddress());
	const payment = coinWithBalance({
		type: coin === 'usdc' ? usdcType() : SUI_TYPE,
		balance: amount,
		useGasCoin: false
	});
	tx.transferObjects([payment], agent.toSuiAddress());

	let digest: string;
	try {
		digest = await execute(tx, await keypairFor(platform, userId), agent);
	} catch (e) {
		return {
			status: 'invalid',
			message: `The payment didn't go through: ${e instanceof Error ? e.message : e}`
		};
	}
	return settle(platform, userId, digest, pack.id, coin, amount);
}

/** Builds, signs with both accounts, and sends; Tatum's gateway first, Sui's public node if needed. */
async function execute(
	tx: Transaction,
	user: Awaited<ReturnType<typeof keypairFor>>,
	agent: NonNullable<ReturnType<typeof agentKeypair>>
): Promise<string> {
	let lastError: unknown;
	for (const client of [reader(), publicNode()]) {
		try {
			const bytes = await tx.build({ client });
			const [a, b] = await Promise.all([user.signTransaction(bytes), agent.signTransaction(bytes)]);
			const result = await client.executeTransaction({
				transaction: bytes,
				signatures: [a.signature, b.signature]
			});
			const digest = result.Transaction?.digest ?? result.FailedTransaction?.digest;
			if (result.FailedTransaction) throw new Error('Sui rejected the transaction');
			if (digest) return digest;
		} catch (e) {
			lastError = e;
		}
	}
	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Reads the transaction back through Tatum, then records it and adds the credits (once). */
async function settle(
	platform: Platform,
	userId: string,
	digest: string,
	packId: string,
	coin: Coin,
	amount: bigint
): Promise<BuyResult> {
	const pack = packOf(packId)!;
	const agentAddress = agentKeypair()!.toSuiAddress();
	let received = 0n;
	for (let attempt = 0; attempt < 5 && received === 0n; attempt++) {
		try {
			const tx = await reader().getTransaction({ digest, include: { balanceChanges: true } });
			for (const change of tx.Transaction?.balanceChanges ?? []) {
				const right = coin === 'usdc' ? usdcType() : SUI_TYPE;
				if (sameAddress(change.address, agentAddress) && sameCoin(change.coinType, right)) {
					received += BigInt(change.amount);
				}
			}
		} catch {
			// Not visible yet: wait a moment.
		}
		if (received === 0n) await new Promise((r) => setTimeout(r, 1500));
	}
	// The app pays the gas, so the full amount must arrive.
	if (received < amount) {
		return {
			status: 'invalid',
			message: `Sent, but Sui hasn't confirmed it yet (${digest}). It will be checked again.`
		};
	}
	const recorded = await withDb(platform, (db) =>
		db
			.insert(suiPayments)
			.values({
				userId,
				txDigest: digest,
				amount,
				coin,
				purpose: pack.id === PRO_ANSWER.id ? 'request' : 'credits',
				confirmedAt: new Date()
			})
			.onConflictDoNothing()
			.returning({ id: suiPayments.id })
	);
	if (!recorded.length) return { status: 'invalid', message: 'That payment was already counted' };
	const balance = await grantCredits(platform, userId, pack.credits, 'purchase', `sui:${digest}`);
	return {
		status: 'paid',
		credits: pack.credits,
		balance,
		coin,
		explorerUrl: `${explorer()}/tx/${digest}`
	};
}

/** The user's payments, newest first, with links. */
export async function paymentsOf(platform: Platform, userId: string) {
	const rows = await withDb(platform, (db) =>
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
	);
	return rows.map((r) => ({
		...r,
		amount: r.amount.toString(),
		explorerUrl: `${explorer()}/tx/${r.txDigest}`
	}));
}
