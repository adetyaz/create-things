import { describe, expect, it } from 'vitest';
import { readNext } from './prompt';
import { rankCandidates, sharedSkills } from './rank';

describe('sharedSkills', () => {
	it('matches skills loosely', () => {
		expect(
			sharedSkills(['CSS Grid', 'Typography'], ['css grid layout', 'Motion', 'typography'])
		).toEqual(['css grid layout', 'typography']);
	});
});

describe('rankCandidates', () => {
	it('ranks by shared skills, then closeness in meaning', () => {
		const ranked = rankCandidates(
			['CSS grid', 'Typography'],
			[
				{ id: 'motion', title: 'Motion course', skills: ['Typography'], summary: null },
				{ id: 'zine', title: 'Riso zine', skills: [], summary: null },
				{ id: 'site', title: 'Portfolio v2', skills: ['CSS grid', 'Typography'], summary: null }
			],
			new Map([
				['done', [1, 0]],
				['zine', [1, 0]],
				['motion', [0, 1]],
				['site', [0, 1]]
			]),
			'done'
		);
		expect(ranked.map((r) => r.id)).toEqual(['site', 'zine', 'motion']);
		expect(ranked[0].shared).toEqual(['CSS grid', 'Typography']);
	});
});

describe('readNext', () => {
	it('only accepts an id from the options', () => {
		expect(
			readNext({ itemId: 'b', reason: 'Builds on grids.', carriesOver: ['grid', ''] }, ['a', 'b'])
		).toEqual({
			itemId: 'b',
			reason: 'Builds on grids.',
			carriesOver: ['grid']
		});
		expect(readNext({ itemId: 'z', reason: 'x' }, ['a'])).toBeNull();
	});
});
