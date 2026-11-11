/**
 * Starting a thing, from anywhere in the app:
 * 1. confirm what the pet understood (free), 2. start it, which plans its roadmap (5 credits),
 * 3. wait for the plan, 4. put its first step on today, next to what's already there.
 * After this, Today's #1 is that step (or it sits under today's existing #1).
 */
import { api, ApiError } from '$lib/api';

export const START_COST = 5;

export type StartStage = 'confirming' | 'starting' | 'planning' | 'placing';
export type StartResult =
	| { status: 'planned'; stepTitle: string }
	| {
			status: 'at_limit';
			message: string;
			limit: number;
			/** What's being worked on now: pause one, or allow more at once. */
			focus: { id: string; title: string }[];
	  }
	| { status: 'failed'; message: string };

type Block = {
	startTime: string | null;
	anchor: string | null;
	place: string | null;
	step: { id: string };
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Puts this step on today, keeping today's other blocks (a day is saved whole). */
export async function placeOnToday(stepId: string): Promise<void> {
	const day = await api<{ day: string; blocks: Block[] }>('/api/plan/day');
	if (day.blocks.some((b) => b.step.id === stepId)) return;
	const keep = day.blocks.map((b) => ({
		day: day.day,
		startTime: b.startTime ? b.startTime.slice(0, 5) : null,
		anchor: b.anchor,
		place: b.place,
		stepId: b.step.id
	}));
	await api('/api/plan/week', 'PUT', { blocks: [...keep, { day: day.day, stepId }] });
}

/** The thing's next step, once its plan exists (null while it's still being made). */
export async function nextStepOf(
	itemId: string
): Promise<{ id: string; title: string } | null | { error: string }> {
	const r = await api<{
		roadmap: { currentStep: { id: string; title: string } | null } | null;
		planError: string | null;
	}>(`/api/items/${itemId}/roadmap`);
	if (r.roadmap?.currentStep) return r.roadmap.currentStep;
	if (r.planError) return { error: r.planError };
	return null;
}

/** Asks for the plan again (after a failed attempt), then puts its first step on today. */
export async function retryPlan(
	itemId: string,
	onStage: (stage: StartStage) => void = () => {}
): Promise<StartResult> {
	try {
		onStage('planning');
		await api(`/api/items/${itemId}/roadmap`, 'POST');
		return await waitAndPlace(itemId, onStage);
	} catch (e) {
		return failure(e);
	}
}

async function waitAndPlace(
	itemId: string,
	onStage: (stage: StartStage) => void
): Promise<StartResult> {
	for (let tries = 0; tries < 40; tries++) {
		await wait(tries < 5 ? 2500 : 4000);
		const step = await nextStepOf(itemId);
		if (step && 'error' in step) return { status: 'failed', message: step.error };
		if (step) {
			onStage('placing');
			await placeOnToday(step.id);
			return { status: 'planned', stepTitle: step.title };
		}
	}
	return {
		status: 'failed',
		message:
			'The plan is taking longer than usual. It will show here and on Today when it is ready.'
	};
}

function failure(e: unknown): StartResult {
	return {
		status: 'failed',
		message:
			e instanceof ApiError && e.code === 'out_of_credits'
				? `Making a plan needs ${e.cost ?? START_COST} credits, and today's free ones are used up.`
				: e instanceof Error
					? e.message
					: 'Something went wrong. Try again.'
	};
}

export async function startThing(
	itemId: string,
	onStage: (stage: StartStage) => void = () => {}
): Promise<StartResult> {
	try {
		onStage('confirming');
		await api(`/api/items/${itemId}/understanding`, 'PUT', {}).catch(() => null);

		onStage('starting');
		const started = await api<{
			status: string;
			limit?: number;
			focus?: { id: string; title: string }[];
		}>('/api/focus/decide', 'POST', {
			itemId,
			decision: 'start'
		});
		if (started.status === 'at_limit') {
			const limit = started.limit ?? 1;
			return {
				status: 'at_limit',
				limit,
				focus: (started.focus ?? []).map((i) => ({ id: i.id, title: i.title })),
				message: `You work on ${limit} ${limit === 1 ? 'thing' : 'things'} at a time.`
			};
		}

		onStage('planning');
		for (let tries = 0; tries < 40; tries++) {
			const step = await nextStepOf(itemId);
			if (step && 'error' in step) return { status: 'failed', message: step.error };
			if (step) {
				onStage('placing');
				await placeOnToday(step.id);
				return { status: 'planned', stepTitle: step.title };
			}
			await wait(tries < 5 ? 2500 : 4000);
		}
		return {
			status: 'failed',
			message: 'The plan is taking longer than usual. It will show on Today when it is ready.'
		};
	} catch (e) {
		return {
			status: 'failed',
			message:
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Making a plan needs ${e.cost ?? START_COST} credits, and today's free ones are used up.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.'
		};
	}
}

/** Allow more things at once (1–3). */
export async function setFocusLimit(limit: number): Promise<void> {
	await api('/api/settings/focus', 'PUT', { limit });
}

/** Pause a thing: back to the Shortlist, progress kept. */
export async function pauseThing(itemId: string): Promise<void> {
	await api('/api/focus/pause', 'POST', { itemId });
}
