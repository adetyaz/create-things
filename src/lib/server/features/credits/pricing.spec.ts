import { describe, expect, it } from 'vitest';
import { costOf, freeQuotaApplies, quotaDay } from './pricing';

describe('costOf', () => {
	it('multiplies the base cost by the tier', () => {
		expect(costOf('analysis')).toBe(2);
		expect(costOf('analysis', 'plus')).toBe(6);
		expect(costOf('roadmap', 'pro')).toBe(50);
	});
});

describe('freeQuotaApplies', () => {
	it('only covers Basic', () => {
		expect(freeQuotaApplies('basic')).toBe(true);
		expect(freeQuotaApplies('plus')).toBe(false);
		expect(freeQuotaApplies('pro')).toBe(false);
	});
});

describe('quotaDay', () => {
	it('uses the UTC date', () => {
		expect(quotaDay(new Date('2026-10-31T23:30:00-05:00'))).toBe('2026-11-01');
		expect(quotaDay(new Date('2026-10-31T00:10:00Z'))).toBe('2026-10-31');
	});
});
