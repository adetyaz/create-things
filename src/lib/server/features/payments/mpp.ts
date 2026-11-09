/**
 * Pay per request with MPP (the Machine Payments Protocol, mpp.dev) on Sui, using suimpp's
 * "sui/charge" method, so any MPP client can pay for a Pro answer:
 *
 *   1. POST /api/mpp/pro-answer → 402 Payment Required, with the price (WWW-Authenticate: Payment)
 *   2. the client pays on Sui, signs a proof over { challenge, digest }, retries with it
 *   3. Tatum reads the transaction (succeeded, enough to the app's account, proof signer = sender);
 *      each transaction pays for one answer → 200 with the answer and a Payment-Receipt header
 *
 * The app's own "Pro answer" button is one of those clients: the user's app-made account pays and
 * the app pays the gas (no wallet), going through exactly the same 402 exchange.
 */
import { eq } from 'drizzle-orm';
import { Credential, Method, Receipt } from 'mppx-sui';
import { Mppx } from 'mppx-sui/server';
import { Mppx as MppxClient } from 'mppx-sui/client';
import { suiCharge, parseAmountToRaw } from '@suimpp/mpp';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { withDb } from '$lib/server/db';
import { suiPayments } from '$lib/server/db/schema';
import { requiredEnv } from '$lib/server/platform/env';
import { getExchangeRate } from '$lib/server/integrations/tatum';
import { grantCredits } from '$lib/server/features/credits/service';
import { chat } from '$lib/server/features/chat/service';
import { chatInput, type ChatInput } from '$lib/server/features/chat/input';
import { PRO_ANSWER, rawAmount, sameAddress, sameCoin } from './packs';
import { accountFor, keypairFor } from './accounts';
import { agentKeypair, explorer, network, publicNode, reader, SUI_TYPE, usdcType } from './network';
import { execute } from './service';

type Platform = App.Platform | undefined;
type Currency = { type: string; decimals: number; coin: 'usdc' | 'sui' };

/** Fixed, so a challenge stays valid whichever host name the request came in on. */
const REALM = 'createthings';
/** A quote stays payable while the price hasn't dropped more than this since it was given. */
const QUOTE_SLACK = 0.95;
/** The app's own client never pays more than this times the current price. */
const PAY_CAP = 1.5;

/** Testnet charges in SUI (the faucet only gives SUI); mainnet in USDC. */
export function mppCurrency(net = network()): Currency {
	return net === 'mainnet'
		? { type: usdcType(net), decimals: 6, coin: 'usdc' }
		: { type: normalizeStructTag(SUI_TYPE), decimals: 9, coin: 'sui' };
}

/** "0.25" style decimal string of raw units. */
export function formatRaw(raw: bigint, decimals: number): string {
	const s = raw.toString().padStart(decimals + 1, '0');
	const frac = s.slice(-decimals).replace(/0+$/, '');
	return frac ? `${s.slice(0, -decimals)}.${frac}` : s.slice(0, -decimals);
}

/** Today's price of one Pro answer, in raw units of the charge coin. */
async function priceRaw(currency: Currency): Promise<bigint> {
	if (currency.coin === 'usdc') return rawAmount(PRO_ANSWER.usd, 'usdc');
	const rate = await getExchangeRate('SUI', 'USD').catch(() => null);
	return rawAmount(PRO_ANSWER.usd, 'sui', rate ? Number(rate.value) : undefined);
}

/**
 * The amount this request is charged. A retry carries the quote it was given (signed by this
 * server, at most 5 minutes old); SUI's price moves, so that quote is honoured if it's still within
 * QUOTE_SLACK of today's price.
 */
async function amountFor(request: Request, currency: Currency): Promise<string> {
	const now = await priceRaw(currency);
	try {
		const echoed = Credential.fromRequest<{ digest: string }>(request).challenge.request as {
			amount?: string;
		};
		if (echoed.amount) {
			const quoted = parseAmountToRaw(echoed.amount, currency.decimals);
			if (quoted * 100n >= now * BigInt(Math.round(QUOTE_SLACK * 100))) return echoed.amount;
		}
	} catch {
		// No payment yet: quote today's price.
	}
	return formatRaw(now, currency.decimals);
}

/** suimpp's proof message: binds the transaction to this challenge and its sender's key. */
function proofBytes(
	challenge: { id: string; method: string; intent: string; request: Record<string, unknown> },
	digest: string
): Uint8Array {
	return new TextEncoder().encode(
		JSON.stringify({
			domain: 'suimpp.sui.payment-proof',
			version: 1,
			method: challenge.method,
			intent: challenge.intent,
			challengeId: challenge.id,
			amount: challenge.request.amount,
			currency: challenge.request.currency,
			recipient: challenge.request.recipient,
			digest
		})
	);
}

/** The transaction as Tatum's gateway sees it (Sui's public node if Tatum can't find it yet). */
async function readTransaction(digest: string) {
	for (let attempt = 0; attempt < 5; attempt++) {
		for (const [by, client] of [
			['tatum', reader()],
			['sui-node', publicNode()]
		] as const) {
			try {
				const tx = await client.getTransaction({
					digest,
					include: { balanceChanges: true, transaction: true }
				});
				const found = tx.Transaction ?? tx.FailedTransaction;
				if (found) return { tx: found, by };
			} catch {
				// Not visible there yet.
			}
		}
		await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
	}
	return null;
}

export type ProAnswerResult =
	| { status: 'challenge'; response: Response }
	| { status: 'paid'; response: Response };

/**
 * POST /api/mpp/pro-answer for this user: a 402 with the price, or (after payment is confirmed)
 * the Pro answer. The body is a chat request (POST /api/chat); it's checked before any charge.
 */
export async function proAnswer(
	platform: Platform,
	userId: string,
	request: Request
): Promise<Response> {
	const agent = agentKeypair();
	if (!agent) return Response.json({ message: 'Payments are not set up yet' }, { status: 503 });
	const parsed = chatInput.safeParse(
		await request
			.clone()
			.json()
			.catch(() => null)
	);
	if (!parsed.success) {
		return Response.json(
			{ message: 'Send a chat request', issues: parsed.error.issues },
			{ status: 400 }
		);
	}

	const currency = mppCurrency();
	const recipient = agent.toSuiAddress();
	const paid: { digest?: string; by?: string; raw?: bigint } = {};

	const method = Method.toServer(suiCharge, {
		defaults: { currency: currency.type, recipient },
		async verify({ credential }) {
			const { digest, signature } = credential.payload;
			const asked = credential.challenge.request;
			if (!sameCoin(asked.currency, currency.type)) throw new Error('Wrong coin');
			const used = await withDb(platform, (db) =>
				db.select({ id: suiPayments.id }).from(suiPayments).where(eq(suiPayments.txDigest, digest))
			);
			if (used.length) throw new Error('That transaction already paid for a request');

			const read = await readTransaction(digest);
			if (!read || !read.tx.status.success) throw new Error('Transaction not found or failed');
			let received = 0n;
			for (const change of read.tx.balanceChanges ?? []) {
				if (sameAddress(change.address, recipient) && sameCoin(change.coinType, currency.type)) {
					received += BigInt(change.amount);
				}
			}
			const wanted = parseAmountToRaw(asked.amount, currency.decimals);
			if (received < wanted) throw new Error(`Received ${received}, asked ${wanted} (raw units)`);

			const signer = await verifyPersonalMessageSignature(
				proofBytes(credential.challenge, digest),
				signature
			).catch(() => null);
			const sender = read.tx.transaction?.sender;
			if (!signer || !sender || !sameAddress(signer.toSuiAddress(), sender)) {
				throw new Error('The payment proof was not signed by the sender');
			}

			// Recording it is what makes each transaction count once.
			const recorded = await withDb(platform, (db) =>
				db
					.insert(suiPayments)
					.values({
						userId,
						txDigest: digest,
						amount: received,
						coin: currency.coin,
						purpose: 'request',
						confirmedAt: new Date()
					})
					.onConflictDoNothing()
					.returning({ id: suiPayments.id })
			);
			if (!recorded.length) throw new Error('That transaction already paid for a request');
			Object.assign(paid, { digest, by: read.by, raw: received });
			return Receipt.from({
				method: 'sui',
				reference: digest,
				status: 'success',
				timestamp: new Date().toISOString()
			});
		}
	});

	const mppx = Mppx.create({
		methods: [method],
		realm: REALM,
		secretKey: `mpp:${requiredEnv('SOURCE_TOKEN_KEY')}`
	});
	const result = await mppx.charge({
		amount: await amountFor(request, currency),
		description: 'One Pro answer from your pet'
	})(request);
	if (result.status === 402) return result.challenge;

	// Paid: add exactly one Pro answer's credits, then spend them on the answer.
	await grantCredits(platform, userId, PRO_ANSWER.credits, 'purchase', `mpp:${paid.digest}`);
	const answer = await chat(platform, userId, { ...parsed.data, tier: 'pro' });
	return result.withReceipt(
		Response.json({
			answer,
			payment: {
				protocol: 'MPP (sui/charge)',
				digest: paid.digest,
				amount: formatRaw(paid.raw ?? 0n, currency.decimals),
				coin: currency.coin.toUpperCase(),
				confirmedBy: paid.by === 'tatum' ? 'Tatum' : "Sui's public node",
				explorerUrl: `${explorer()}/tx/${paid.digest}`
			}
		})
	);
}

/**
 * The app's "Pro answer" button: an MPP client that pays from the user's app-made account (the
 * app pays the gas) and talks to proAnswer() through the same 402 → pay → retry exchange.
 */
export async function payForProAnswer(platform: Platform, userId: string, input: ChatInput) {
	const agent = agentKeypair();
	if (!agent) return Response.json({ message: 'Payments are not set up yet' }, { status: 503 });
	const { address } = await accountFor(platform, userId);
	const user = await keypairFor(platform, userId);
	const currency = mppCurrency();
	const cap = ((await priceRaw(currency)) * BigInt(PAY_CAP * 100)) / 100n;

	const method = Method.toClient(suiCharge, {
		async createCredential({ challenge }) {
			const { amount, currency: coinType, recipient } = challenge.request;
			if (!sameCoin(coinType, currency.type)) throw new Error(`Unexpected coin ${coinType}`);
			if (!sameAddress(recipient, agent.toSuiAddress())) throw new Error('Unexpected recipient');
			const raw = parseAmountToRaw(amount, currency.decimals);
			if (raw > cap) throw new Error('The price is higher than expected; not paying');

			// The user's account sends the payment (never the gas coin); the app pays the gas.
			const tx = new Transaction();
			tx.setSender(address);
			tx.setGasOwner(agent.toSuiAddress());
			tx.moveCall({
				target: '0x2::balance::send_funds',
				typeArguments: [currency.type],
				arguments: [
					tx.balance({ type: currency.type, balance: raw, useGasCoin: false }),
					tx.pure.address(recipient)
				]
			});
			const digest = await execute(tx, user, agent);
			const proof = await user.signPersonalMessage(proofBytes(challenge, digest));
			return Credential.serialize({ challenge, payload: { digest, signature: proof.signature } });
		}
	});

	// "fetch" here calls proAnswer() directly: same protocol, no network hop.
	const client = MppxClient.create({
		methods: [method],
		polyfill: false,
		fetch: async (input, init) => proAnswer(platform, userId, new Request(input, init))
	});
	return client.fetch('https://createthings.local/api/mpp/pro-answer', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(input)
	});
}
