import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { shutdownInput } from '$lib/server/features/plan/input';
import { applyShutdown, getShutdown } from '$lib/server/features/plan/shutdown';

/** GET /api/plan/shutdown: done today, what moves, tomorrow's top 3 pre-filled, whether it's due. */
export const GET: RequestHandler = async (event) => {
	return json(await getShutdown(event.platform, currentUserId(event)));
};

/** POST /api/plan/shutdown { moves, drop, tomorrow, note? }: apply it and save a session summary. */
export const POST: RequestHandler = async (event) => {
	const input = validate(shutdownInput, await event.request.json().catch(() => ({})));
	const result = await applyShutdown(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(400, 'Blocks and steps must be your own and not done');
	return json(result);
};
