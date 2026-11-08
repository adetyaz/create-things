import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { connections } from '$lib/server/features/sources/service';

/** GET /api/sources: Settings → Connections (accounts, the calendar link, extension devices). */
export const GET: RequestHandler = async (event) => {
	return json(await connections(event.platform, currentUserId(event)));
};
