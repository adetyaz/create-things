import { describe, expect, it } from 'vitest';
import { memoryType } from '$lib/server/db/schema';
import { DELIVERY, digestSummary } from './delivery';

describe('memory delivery', () => {
	it('gives every memory type a delivery', () => {
		for (const type of memoryType.enumValues) expect(DELIVERY[type]).toBeDefined();
	});

	it('keeps analyze for rich memories and the digest for small events', () => {
		expect(DELIVERY.goal).toBe('analyze');
		expect(DELIVERY.plan_change).toBe('remember');
		expect(DELIVERY.pick_feedback).toBe('digest');
	});

	it('writes one line for the day', () => {
		expect(digestSummary('2026-10-31', ['Started "Jazz".', 'Skipped "Pottery" for today.'])).toBe(
			'On 2026-10-31: Started "Jazz"; Skipped "Pottery" for today.'
		);
	});
});
