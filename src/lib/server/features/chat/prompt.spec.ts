import { describe, expect, it } from 'vitest';
import { chatPrompt, readChat } from './prompt';

describe('chatPrompt', () => {
	it('tells a stuck user to take a break first, then a smaller step or a new angle', () => {
		const prompt = chatPrompt({
			mode: 'stuck',
			item: { title: 'Learn jazz piano chords', intent: 'learn', goal: 'Play Autumn Leaves' },
			step: {
				title: 'Drop-2 voicings',
				twoMinute: 'Play one Cmaj7 drop-2',
				searchTerms: ['drop 2 voicings']
			},
			memories: [{ text: 'Struggles with left-hand stretches', distance: 0.3, createdAt: null }],
			messages: [{ role: 'user', text: "I can't get drop-2 voicings" }],
			today: '2026-11-01',
			focus: [],
			todayBlock: null
		});
		expect(prompt.indexOf('short break')).toBeLessThan(prompt.indexOf('smaller step'));
		expect(prompt).toContain('[1] Struggles with left-hand stretches');
		expect(prompt).toContain(
			'Current step: Drop-2 voicings (2-minute start: Play one Cmaj7 drop-2)'
		);
		expect(prompt).toContain("User: I can't get drop-2 voicings");
	});
});

describe('readChat', () => {
	it('keeps valid memory citations and drops the rest', () => {
		expect(
			readChat({ reply: ' Take five. ', memoriesUsed: [1, 1, 3, 9, 'x'], stuckTopic: 'drop-2' }, 3)
		).toEqual({
			reply: 'Take five.',
			memoriesUsed: [1, 3],
			stuckTopic: 'drop-2',
			rememberThis: null
		});
	});

	it('takes memory numbers out of the reply text', () => {
		expect(readChat({ reply: 'It sounds open [1, 2]. Try it [4].' }, 2)?.reply).toBe(
			'It sounds open. Try it.'
		);
	});

	it('returns null without a reply', () => {
		expect(readChat({ memoriesUsed: [1] }, 1)).toBeNull();
	});
});
