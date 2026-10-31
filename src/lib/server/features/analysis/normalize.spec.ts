import { describe, expect, it } from 'vitest';
import { normalizeAnalysis } from './normalize';

describe('normalizeAnalysis', () => {
	it('keeps valid fields and fixes loose ones', () => {
		const result = normalizeAnalysis({
			title: '  Jazz club landing page ',
			summary: 'Editorial landing page',
			mood: 'bold, editorial',
			skills: ['CSS grid', 'Type pairing'],
			size: 'Weekend',
			difficulty: 'MEDIUM',
			intent: 'Learn',
			practiceKind: 'real world',
			goal: ' Play Autumn Leaves ',
			targetDate: '2026-12-12'
		});

		expect(result.title).toBe('Jazz club landing page');
		expect(result.mood).toEqual(['bold', 'editorial']);
		expect(result.skills).toEqual(['CSS grid', 'Type pairing']);
		expect(result.size).toBe('weekend');
		expect(result.difficulty).toBe('medium');
		expect(result.intent).toBe('learn');
		expect(result.practiceKind).toBe('real_world');
		expect(result.goal).toBe('Play Autumn Leaves');
		expect(result.targetDate).toBe('2026-12-12');
	});

	it('drops values outside the allowed sets instead of guessing', () => {
		const result = normalizeAnalysis({
			size: 'two days',
			difficulty: 'tricky',
			intent: 'conquer',
			practiceKind: 'juggling',
			targetDate: 'next week'
		});

		expect(result.size).toBeNull();
		expect(result.difficulty).toBeNull();
		expect(result.intent).toBe('make');
		expect(result.practiceKind).toBeNull();
		expect(result.targetDate).toBeNull();
		expect(result.title).toBeNull();
		expect(result.summary).toBe('');
	});
});
