import { describe, expect, it } from 'vitest';
import { extractJson, normalizeAnalysis } from './normalize';

describe('extractJson', () => {
	it('reads JSON wrapped in prose and code fences', () => {
		const reply = 'Here you go:\n```json\n{"summary": "A bento grid", "size": "weekend"}\n```';
		expect(extractJson(reply)).toEqual({ summary: 'A bento grid', size: 'weekend' });
	});

	it('passes through an already-parsed object', () => {
		expect(extractJson({ a: 1 })).toEqual({ a: 1 });
	});

	it('fails clearly when there is no JSON', () => {
		expect(() => extractJson('sorry, I cannot help')).toThrow(/no JSON/);
	});
});

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
