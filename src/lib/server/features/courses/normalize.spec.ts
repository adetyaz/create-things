import { describe, expect, it } from 'vitest';
import { normalizeCourse } from './normalize';

describe('normalizeCourse', () => {
	it('keeps units in order with their dates, and drops what is unusable', () => {
		const course = normalizeCourse({
			title: ' Intro to Guitar ',
			practiceKind: 'Body',
			examDate: '2026-12-12',
			units: [
				{ title: 'Week 1: Open chords', topics: ['G', 'C', 'D'], date: '2026-11-03' },
				{ title: '', topics: ['orphan'] },
				{ title: 'Week 2: Strumming', date: 'next Tuesday' }
			]
		});
		expect(course.title).toBe('Intro to Guitar');
		expect(course.practiceKind).toBe('body');
		expect(course.examDate).toBe('2026-12-12');
		expect(course.units).toEqual([
			{ title: 'Week 1: Open chords', topics: ['G', 'C', 'D'], date: '2026-11-03' },
			{ title: 'Week 2: Strumming', topics: [], date: null }
		]);
	});

	it('copes with nothing usable', () => {
		const course = normalizeCourse({ units: 'none', practiceKind: 'juggling' });
		expect(course.units).toEqual([]);
		expect(course.practiceKind).toBeNull();
	});
});
