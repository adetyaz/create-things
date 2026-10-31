import { describe, expect, it } from 'vitest';
import { normalizeRoadmap } from './normalize';

describe('normalizeRoadmap', () => {
	it('keeps valid milestones and steps, and clamps drift', () => {
		const roadmap = normalizeRoadmap(
			{
				style: 'skill',
				skills: ['Seventh chords', ''],
				resources: [
					{ title: 'Jazz chord chart', url: 'https://example.com/chart' },
					'Any jazz songbook',
					{ title: 'Bad', url: 'ftp://x' }
				],
				milestones: [
					{
						title: 'Basics',
						steps: [
							{
								title: 'Learn Cmaj7',
								minutes: 120,
								twoMinute: 'Find middle C',
								searchTerms: ['Cmaj7 voicing'],
								tools: ['Piano'],
								recall: 'Which notes make Cmaj7?'
							},
							{ title: 'Learn Dm7' }
						]
					},
					{ title: 'Empty', steps: [] },
					{ title: '', steps: [{ title: 'Orphan' }] }
				]
			},
			'project'
		);

		expect(roadmap.style).toBe('skill');
		expect(roadmap.skills).toEqual(['Seventh chords']);
		expect(roadmap.resources).toEqual([
			{ title: 'Jazz chord chart', url: 'https://example.com/chart' },
			{ title: 'Any jazz songbook', url: null },
			{ title: 'Bad', url: null }
		]);
		expect(roadmap.milestones).toHaveLength(1);
		expect(roadmap.milestones[0].steps[0]).toEqual({
			title: 'Learn Cmaj7',
			minutes: 45,
			twoMinute: 'Find middle C',
			searchTerms: ['Cmaj7 voicing'],
			tools: ['Piano'],
			recall: 'Which notes make Cmaj7?'
		});
		expect(roadmap.milestones[0].steps[1].recall).toBeNull();
		expect(roadmap.milestones[0].steps[1].minutes).toBe(25);
	});

	it('falls back to the given style and copes with nothing usable', () => {
		const roadmap = normalizeRoadmap({ milestones: 'nope' }, 'project');
		expect(roadmap).toEqual({ style: 'project', skills: [], resources: [], milestones: [] });
	});
});
