import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { dueCards } from '$lib/server/features/cards/service';

/** GET /api/reviews: today's due cards, mixed across items, up to the daily cap. */
export const GET: RequestHandler = async (event) => {
	return json(await dueCards(event.platform, currentUserId(event)));
};
