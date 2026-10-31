import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { listFocus } from '$lib/server/features/focus/service';

/** GET /api/focus: what the user is working on now. */
export const GET: RequestHandler = async (event) => {
	return json({ focus: await listFocus(event.platform, currentUserId(event)) });
};
