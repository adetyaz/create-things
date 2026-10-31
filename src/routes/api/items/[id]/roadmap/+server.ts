import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { setGoalInput } from '$lib/server/features/roadmap/input';
import {
	getRoadmap,
	planErrorOf,
	requestRoadmap,
	setGoal
} from '$lib/server/features/roadmap/service';

/**
 * GET /api/items/[id]/roadmap: milestones, steps and the current step, or `roadmap: null`, plus
 * `planError` when the last planning job failed.
 */
export const GET: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const itemId = uuidParam(event.params.id);
	const [roadmap, planError] = await Promise.all([
		getRoadmap(event.platform, userId, itemId),
		planErrorOf(event.platform, userId, itemId)
	]);
	return json({ roadmap, planError });
};

/** POST /api/items/[id]/roadmap: plan (or re-plan from scratch) this item's roadmap. */
export const POST: RequestHandler = async (event) => {
	const itemId = uuidParam(event.params.id);
	const delivery = await requestRoadmap(event.platform, currentUserId(event), itemId);
	if (!delivery) error(404, 'No item with that id');
	return json({ itemId, delivery }, { status: 202 });
};

/** PATCH /api/items/[id]/roadmap { goal }: choose or write the goal; the roadmap re-plans toward it. */
export const PATCH: RequestHandler = async (event) => {
	const { goal } = validate(setGoalInput, await event.request.json().catch(() => ({})));
	const result = await setGoal(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		goal
	);
	if (result.status === 'not_found') error(404, 'This item has no roadmap yet');
	return json(result, { status: 202 });
};
