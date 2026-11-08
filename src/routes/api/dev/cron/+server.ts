import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { optionalEnv } from '$lib/server/platform/env';
import { currentUserId } from '$lib/server/platform/user';
import { drawnTo, runDaily } from '$lib/server/features/cron/service';

/**
 * POST /api/dev/cron: run the daily jobs now (dev). ?weekly=1 runs only your weekly "what you're
 * drawn to" memory.
 */
export const POST: RequestHandler = async (event) => {
	if (!dev && optionalEnv('DEV_CHECKS') !== '1') error(404);
	if (event.url.searchParams.get('weekly')) {
		return json({ weekly: await drawnTo(event.platform, currentUserId(event)) });
	}
	return json(await runDaily(event.platform));
};
