import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { reshuffleInput } from '$lib/server/features/plan/input';
import { applyReshuffle, getReshuffle } from '$lib/server/features/plan/reshuffle';

/** GET /api/plan/reshuffle: missed blocks with suggested slots, and the never-miss-twice pick. */
export const GET: RequestHandler = async (event) => {
	return json(await getReshuffle(event.platform, currentUserId(event)));
};

/** POST /api/plan/reshuffle { moves, drop, firstToday? }: apply what the user OK'd. */
export const POST: RequestHandler = async (event) => {
	const input = validate(reshuffleInput, await event.request.json().catch(() => ({})));
	const result = await applyReshuffle(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(400, 'Blocks must be your own');
	return json(result);
};
