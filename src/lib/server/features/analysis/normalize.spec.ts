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
			isLearningGoal: 'true'
		});

		expect(result.title).toBe('Jazz club landing page');
		expect(result.mood).toEqual(['bold', 'editorial']);
		expect(result.skills).toEqual(['CSS grid', 'Type pairing']);
		expect(result.size).toBe('weekend');
		expect(result.difficulty).toBe('medium');
		expect(result.isLearningGoal).toBe(true);
	});

	it('drops values outside the allowed sets instead of guessing', () => {
		const result = normalizeAnalysis({
			size: 'two days',
			difficulty: 'tricky',
			isLearningGoal: 'yes'
		});

		expect(result.size).toBeNull();
		expect(result.difficulty).toBeNull();
		expect(result.isLearningGoal).toBe(false);
		expect(result.title).toBeNull();
		expect(result.summary).toBe('');
	});
});
