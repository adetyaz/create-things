import { describe, expect, it } from 'vitest';
import { parseAmountToRaw } from '@suimpp/mpp';
import { formatRaw, mppCurrency } from './mpp';

describe('MPP amounts', () => {
	it('writes raw units as the decimal string MPP sends', () => {
		expect(formatRaw(250000n, 6)).toBe('0.25');
		expect(formatRaw(1500000n, 6)).toBe('1.5');
		expect(formatRaw(2000000n, 6)).toBe('2');
		expect(formatRaw(123456789n, 9)).toBe('0.123456789');
	});

	it("round-trips through suimpp's parser", () => {
		for (const raw of [1n, 250000n, 123456789n, 10n ** 12n]) {
			expect(parseAmountToRaw(formatRaw(raw, 9), 9)).toBe(raw);
		}
	});

	it('charges SUI on testnet (long coin type, as Sui reports it) and USDC on mainnet', () => {
		expect(mppCurrency('testnet')).toMatchObject({
			coin: 'sui',
			decimals: 9,
			type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
		});
		expect(mppCurrency('mainnet')).toMatchObject({ coin: 'usdc', decimals: 6 });
	});
});
