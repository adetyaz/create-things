import { describe, expect, it } from 'vitest';
import { commonWords } from './service';

describe('import summary', () => {
	it('finds what a collection is mostly about, without AI', () => {
		expect(
			commonWords([
				'Riso poster with grain',
				'Two-colour riso print, grainy poster',
				'Poster layout https://example.com',
				'A cat'
			])
		).toEqual(['poster', 'riso']);
	});
});
