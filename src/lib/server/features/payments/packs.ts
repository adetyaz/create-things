/**
 * What can be bought (Breakdown §14, pricing.md): credit packs and a one-off Pro answer, priced in
 * US dollars and paid in USDC (or SUI at Tatum's exchange rate). Numbers to tune before launch.
 */
import { costOf } from '$lib/server/features/credits/pricing';

export interface Pack {
	id: string;
	label: string;
	credits: number;
	usd: number;
}

export const PACKS: Pack[] = [
	{ id: 'small', label: '100 credits', credits: 100, usd: 1.5 },
	{ id: 'medium', label: '250 credits (+25 free)', credits: 275, usd: 3.5 },
	{ id: 'large', label: '600 credits (+100 free)', credits: 700, usd: 7.5 }
];

/** One Pro answer: exactly the credits a Pro-tier chat costs. */
export const PRO_ANSWER: Pack = {
	id: 'pro_answer',
	label: 'One Pro answer',
	credits: costOf('petChat', 'pro'),
	usd: 0.25
};

export function packOf(id: string): Pack | undefined {
	return id === PRO_ANSWER.id ? PRO_ANSWER : PACKS.find((p) => p.id === id);
}

/** Native USDC on Sui mainnet (6 decimals) and SUI (9 decimals). */
export const COINS = {
	usdc: {
		type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
		decimals: 6
	},
	sui: { type: '0x2::sui::SUI', decimals: 9 }
} as const;
export type Coin = keyof typeof COINS;

/** Raw coin units for a dollar price (SUI needs the rate: dollars per SUI). */
export function rawAmount(usd: number, coin: Coin, suiUsd?: number): bigint {
	const units = coin === 'usdc' ? usd : usd / (suiUsd ?? NaN);
	if (!Number.isFinite(units) || units <= 0) throw new Error('No price for that coin right now');
	return BigInt(Math.ceil(units * 10 ** COINS[coin].decimals));
}

/** "0x2::sui::SUI" and "0x000…0002::sui::SUI" are the same coin. */
export function sameCoin(a: string, b: string): boolean {
	const norm = (t: string) => {
		const [addr, ...rest] = t.split('::');
		return [`0x${addr.replace(/^0x/, '').replace(/^0+/, '')}`.toLowerCase(), ...rest].join('::');
	};
	return norm(a) === norm(b);
}

export function sameAddress(a: string, b: string): boolean {
	const norm = (x: string) => x.toLowerCase().replace(/^0x/, '').padStart(64, '0');
	return norm(a) === norm(b);
}
