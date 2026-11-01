import { describe, expect, it } from 'vitest';
import { quizPrompt, readQuiz, shuffleOptions } from './quiz-prompt';

describe('quizPrompt', () => {
	it('lists the milestone and mixes in earlier material', () => {
		const prompt = quizPrompt({
			itemTitle: 'Learn jazz piano chords',
			milestone: 'Shell voicings',
			steps: [
				{
					title: 'Play 3-7 shells',
					recall: 'Which notes make a shell?',
					recallAnswer: '3rd and 7th'
				}
			],
			earlier: [{ question: 'What is a ii-V-I?', answer: 'A cadence' }]
		});
		expect(prompt).toContain('- Play 3-7 shells (recall: Which notes make a shell? → 3rd and 7th)');
		expect(prompt).toContain('mix 1-2 of these in');
		expect(prompt).toContain('which comes next');
	});
});

describe('readQuiz', () => {
	it('keeps well-formed questions only', () => {
		const questions = readQuiz({
			questions: [
				{
					question: 'Shell notes?',
					options: ['1 and 5', '3 and 7'],
					answer: 1,
					explanation: 'Guide tones.'
				},
				{ question: 'Bad index', options: ['a', 'b'], answer: 5 },
				{ question: 'Too few', options: ['a'], answer: 0 }
			]
		});
		expect(questions).toHaveLength(1);
		expect(questions[0]).toMatchObject({ answer: 1, topic: 'general' });
	});
});

describe('shuffleOptions', () => {
	it('moves the options and keeps the answer pointing at the right one', () => {
		const q = {
			question: 'Q',
			options: ['a', 'b', 'c', 'd'],
			answer: 2,
			explanation: '',
			topic: 't'
		};
		const shuffled = shuffleOptions(q, () => 0);
		expect(shuffled.options).not.toEqual(q.options);
		expect(shuffled.options[shuffled.answer]).toBe('c');
	});
});
