import { error, json, type RequestHandler } from '@sveltejs/kit';
import { runDaily } from '$lib/server/features/cron/service';

/**
 * POST /api/internal/cron: the daily jobs. The worker's scheduled() handler (scripts/worker-entry.js)
 * calls this in-process with a flag outside requests can't set.
 */
export const POST: RequestHandler = async ({ platform }) => {
	if (platform?.env?.__FROM_CRON !== true) error(404);
	return json(await runDaily(platform));
};
