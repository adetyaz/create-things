import { describe, expect, it } from 'vitest';
import { PLAN_PERIODS, periodOf } from './periods';

describe('plan periods', () => {
	it('works out each period around a day', () => {
		expect(periodOf('year', '2026-10-31')).toEqual({
			startsOn: '2026-01-01',
			endsOn: '2026-12-31',
			name: '2026'
		});
		expect(periodOf('half', '2026-10-31')).toEqual({
			startsOn: '2026-07-01',
			endsOn: '2026-12-31',
			name: 'H2 2026'
		});
		expect(periodOf('quarter', '2026-10-31')).toEqual({
			startsOn: '2026-10-01',
			endsOn: '2026-12-31',
			name: 'Q4 2026'
		});
		expect(periodOf('quarter', '2026-02-10')).toEqual({
			startsOn: '2026-01-01',
			endsOn: '2026-03-31',
			name: 'Q1 2026'
		});
		expect(periodOf('month', '2026-11-15').endsOn).toBe('2026-11-30');
	});

	it('chains each period to the one above it', () => {
		const chain: string[] = [];
		let kind: string | null = 'week';
		while (kind) {
			chain.push(kind);
			kind = PLAN_PERIODS[kind as keyof typeof PLAN_PERIODS].parent;
		}
		expect(chain).toEqual(['week', 'month', 'quarter', 'half', 'year']);
	});
});
