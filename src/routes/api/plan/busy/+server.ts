import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { proposeWeekInput, saveWeekInput } from '$lib/server/features/plan/input';
import { applyBusyWeek, proposeBusyWeek } from '$lib/server/features/plan/reshuffle';

/** POST /api/plan/busy { blocks }: the blocks you really have → what stays and what moves. */
export const POST: RequestHandler = async (event) => {
	const { blocks } = validate(proposeWeekInput, await event.request.json().catch(() => ({})));
	return json(await proposeBusyWeek(event.platform, currentUserId(event), blocks));
};

/** PUT /api/plan/busy { blocks: [{ ..., stepId }] }: replace the rest of this week with these. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(saveWeekInput, await event.request.json().catch(() => ({})));
	const result = await applyBusyWeek(event.platform, currentUserId(event), input);
	if (result.status === 'invalid')
		error(400, 'Blocks can only hold steps already planned this week');
	return json(result);
};
