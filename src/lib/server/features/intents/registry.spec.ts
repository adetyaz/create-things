import { describe, expect, it } from 'vitest';
import { PLAN_SHAPES, resolveShape } from '$lib/server/features/plan/shapes';
import { practiceKindOf } from './practice';
import { INTENTS, intentOf } from './registry';

describe('intent registry', () => {
	it('points every intent at a plan shape that exists', () => {
		for (const intent of Object.values(INTENTS)) expect(PLAN_SHAPES).toHaveProperty(intent.shape);
	});

	it('falls back to a roadmap for shapes that are not built yet', () => {
		expect(resolveShape('roadmap')).toBe('roadmap');
		expect(resolveShape('recurring')).toBe('roadmap');
	});

	it('reads unknown or missing ids as the default intent', () => {
		expect(intentOf('learn').roadmapStyle).toBe('skill');
		expect(intentOf('nonsense').id).toBe('make');
		expect(intentOf(null).id).toBe('make');
	});

	it('returns no practice kind for unknown ids', () => {
		expect(practiceKindOf('body')?.label).toBe('Body and hands');
		expect(practiceKindOf('juggling')).toBeNull();
	});
});
