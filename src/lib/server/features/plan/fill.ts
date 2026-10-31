/** Filling a week's blocks with roadmap steps, and saying each block as an implementation intention. */
import { weekdayName } from './dates';

export interface BlockRequest {
	day: string;
	/** HH:MM, or null when the block follows a habit anchor. */
	startTime?: string | null;
	anchor?: string | null;
	place?: string | null;
}

export interface StepOption {
	id: string;
	title: string;
	minutes: number;
	twoMinute: string | null;
	itemId: string;
	itemTitle: string;
	/** The milestone it belongs to; for a course, the unit's title. */
	milestone?: string;
}

export interface FilledBlock extends BlockRequest {
	step: StepOption | null;
	intention: string | null;
}

/**
 * Blocks in time order, each given the next step, taking turns between goals so every goal moves
 * this week. `queues` holds each goal's pending steps in roadmap order. Blocks left over stay empty.
 */
export function fillBlocks(blocks: BlockRequest[], queues: StepOption[][]): FilledBlock[] {
	const pending = queues.map((q) => [...q]).filter((q) => q.length > 0);
	let turn = 0;
	return [...blocks].sort(byTime).map((block) => {
		let step: StepOption | null = null;
		for (let tries = 0; tries < pending.length && !step; tries++) {
			step = pending[turn % pending.length].shift() ?? null;
			turn++;
		}
		return { ...block, step, intention: step ? intention(block, step.title) : null };
	});
}

/** "I will sketch three logo ideas on Tue at 08:00 at my desk". */
export function intention(block: BlockRequest, stepTitle: string): string {
	const lowered = stepTitle.charAt(0).toLowerCase() + stepTitle.slice(1);
	// Learning steps read as time on something ("25 minutes on chord shapes").
	const what = /^\d+\s*(minutes?|mins?)\s/i.test(lowered) ? `spend ${lowered}` : lowered;
	const when = block.startTime
		? ` at ${block.startTime.slice(0, 5)}`
		: block.anchor
			? ` ${block.anchor}`
			: '';
	const where = block.place ? ` at ${block.place}` : '';
	return `I will ${what} on ${weekdayName(block.day)}${when}${where}`;
}

/** Day order, then clock time; anchored blocks follow the timed ones. */
export function byTime(a: BlockRequest, b: BlockRequest): number {
	return a.day.localeCompare(b.day) || (a.startTime ?? '99').localeCompare(b.startTime ?? '99');
}
