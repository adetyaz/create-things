import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { applyFitInput, fitInput } from '$lib/server/features/plan/input';
import { applyFit, proposeFit } from '$lib/server/features/plan/fit';

/** POST /api/plan/fit { itemId }: the goal a new idea belongs to, and ways to fit it in. */
export const POST: RequestHandler = async (event) => {
	const { itemId } = validate(fitInput, await event.request.json().catch(() => ({})));
	const proposal = await proposeFit(event.platform, currentUserId(event), itemId);
	if (!proposal) error(404, 'No item with that id');
	return json(proposal);
};

/** PUT /api/plan/fit { itemId, choice, relatedItemId?, parkUntil? }: apply one offer. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(applyFitInput, await event.request.json().catch(() => ({})));
	const result = await applyFit(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(400, result.reason);
	return json(result);
};
