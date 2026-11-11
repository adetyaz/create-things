import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { decideInput } from '$lib/server/features/focus/input';
import { decide } from '$lib/server/features/focus/service';

/** POST /api/focus/decide { itemId, decision: start | not_today | let_go }. */
export const POST: RequestHandler = async (event) => {
	const { itemId, decision } = validate(decideInput, await event.request.json().catch(() => ({})));
	const result = await decide(event.platform, currentUserId(event), itemId, decision);
	if (result.status === 'not_found') error(404, 'No shortlisted item with that id');
	// At the Focus limit: say so (status 'at_limit'), with what's in focus, so the user can pause
	// one or allow one more. Sent as 200 so the screen gets the list instead of an error.
	return json(result);
};
