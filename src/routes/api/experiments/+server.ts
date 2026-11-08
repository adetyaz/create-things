import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { variantsOf } from '$lib/server/features/experiments/service';

/** GET /api/experiments: this user's variant for each experiment (screens pick defaults by it). */
export const GET: RequestHandler = async (event) => {
	return json({ variants: await variantsOf(event.platform, currentUserId(event)) });
};
