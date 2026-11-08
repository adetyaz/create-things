import { describe, expect, it } from 'vitest';
import { rawAmount, sameAddress, sameCoin } from './packs';

describe('payment amounts', () => {
	it('prices in raw coin units', () => {
		expect(rawAmount(1.5, 'usdc')).toBe(1_500_000n);
		expect(rawAmount(3, 'sui', 1.5)).toBe(2_000_000_000n);
		expect(() => rawAmount(3, 'sui')).toThrow();
	});

	it('matches coins and addresses however they are written', () => {
		expect(sameCoin('0x2::sui::SUI', `0x${'0'.repeat(63)}2::sui::SUI`)).toBe(true);
		expect(sameCoin('0x2::sui::SUI', '0xdba3::usdc::USDC')).toBe(false);
		expect(sameAddress('0xAbC', `0x${'0'.repeat(61)}abc`)).toBe(true);
	});
});
