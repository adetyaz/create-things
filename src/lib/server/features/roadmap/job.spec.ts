import { describe, expect, it } from 'vitest';
import { milestonesAhead } from './job';

const step = (milestone: string, position: number, done = false) => ({
	milestone,
	position,
	doneAt: done ? new Date() : null
});

describe('milestonesAhead', () => {
	it('lists only untouched milestones after the last finished step', () => {
		const steps = [
			step('Basics', 0, true),
			step('Basics', 1, true),
			step('Practice', 2),
			step('Practice', 3),
			step('Project', 4)
		];
		expect(milestonesAhead(steps)).toEqual(['Practice', 'Project']);
	});

	it('leaves a started milestone alone', () => {
		const steps = [
			step('Basics', 0, true),
			step('Practice', 1, true),
			step('Practice', 2),
			step('Project', 3)
		];
		expect(milestonesAhead(steps)).toEqual(['Project']);
	});

	it('is empty when everything is done', () => {
		expect(milestonesAhead([step('Basics', 0, true)])).toEqual([]);
	});
});
