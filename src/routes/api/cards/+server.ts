import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { library } from '$lib/server/features/cards/service';

/** GET /api/cards: the knowledge library, grouped by item. */
export const GET: RequestHandler = async (event) => {
	return json({ library: await library(event.platform, currentUserId(event)) });
};
