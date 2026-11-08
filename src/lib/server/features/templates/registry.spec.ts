import { describe, expect, it } from 'vitest';
import { SHORT_LIST, suggestByWords, summaryOf, templateOf, TEMPLATES } from './registry';
import { placement } from '$lib/server/features/experiments/service';

describe('templates', () => {
	it('suggests user types from how someone describes themselves', () => {
		expect(suggestByWords('I make silver rings and want to sell them')[0].id).toBe('crafts');
		expect(suggestByWords('studying for the AWS cloud certification')[0].id).toBe('exam');
		expect(suggestByWords('nothing in particular')).toEqual([]);
	});

	it('keeps the short list to real templates', () => {
		expect(SHORT_LIST.every((id) => templateOf(id))).toBe(true);
		expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
	});

	it('says the setup in plain words', () => {
		expect(summaryOf([templateOf('crafts')!], 'every 2 days at 19:00')).toContain(
			"You'll check in every 2 days at 19:00. Your pet eats when you log pieces you make"
		);
	});
});

describe('experiment placement', () => {
	it('is stable and spreads users across variants', () => {
		expect(placement('user-1', 'onboarding_ask', 3)).toBe(placement('user-1', 'onboarding_ask', 3));
		const seen = new Set(Array.from({ length: 60 }, (_, i) => placement(`u${i}`, 'x', 3)));
		expect(seen.size).toBe(3);
	});
});
