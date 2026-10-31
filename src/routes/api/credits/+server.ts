import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { getCreditSummary } from '$lib/server/features/credits/service';

/** GET /api/credits: bought credits plus today's free AI quota. */
export const GET: RequestHandler = async (event) => {
	return json(await getCreditSummary(event.platform, currentUserId(event)));
};
