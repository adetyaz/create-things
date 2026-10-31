import { describe, expect, it } from 'vitest';
import { alignToUnits, normalizeRoadmap } from './normalize';

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
			recall: 'Which notes make Cmaj7?',
			kind: 'step'
		});
		expect(roadmap.milestones[0].steps[1].recall).toBeNull();
		expect(roadmap.milestones[0].steps[1].minutes).toBe(25);
	});

	it('falls back to the given style and copes with nothing usable', () => {
		const roadmap = normalizeRoadmap({ milestones: 'nope' }, 'project');
		expect(roadmap).toEqual({
			style: 'project',
			goalOptions: [],
			skills: [],
			resources: [],
			milestones: []
		});
	});

	it('keeps goal options and closes milestones with proving grounds', () => {
		const roadmap = normalizeRoadmap(
			{
				goalOptions: ["By the end you'll be able to play Autumn Leaves", '', 'Comp a blues'],
				milestones: [
					{
						title: 'Milestone 1: Shell voicings',
						steps: [{ title: 'Learn 3-7 shells' }],
						provingGround: [{ title: 'Play Autumn Leaves (A section)', minutes: 40 }, {}]
					},
					{ title: 'Only proofs', provingGround: [{ title: 'Play a song' }] }
				]
			},
			'skill'
		);
		expect(roadmap.goalOptions).toEqual([
			"By the end you'll be able to play Autumn Leaves",
			'Comp a blues'
		]);
		expect(roadmap.milestones).toHaveLength(1);
		expect(roadmap.milestones[0].title).toBe('Shell voicings');
		expect(roadmap.milestones[0].steps.map((s) => [s.kind, s.title, s.minutes])).toEqual([
			['step', 'Learn 3-7 shells', 25],
			['proof', 'Play Autumn Leaves (A section)', 40]
		]);
	});
});

describe('alignToUnits', () => {
	it('names course milestones after their units, in order', () => {
		const step = {
			title: 's',
			minutes: 25,
			twoMinute: null,
			searchTerms: [],
			tools: [],
			recall: null,
			kind: 'step' as const
		};
		const aligned = alignToUnits(
			[
				{ title: 'Week 1 (class 2026-11-01): Holding the guitar', steps: [step] },
				{ title: 'Week 2 stuff', steps: [step] },
				{ title: 'Extra review', steps: [step] }
			],
			['Week 1: Holding the guitar', 'Week 2: Open chords']
		);
		expect(aligned.map((m) => m.title)).toEqual([
			'Week 1: Holding the guitar',
			'Week 2: Open chords',
			'Extra review'
		]);
	});
});
