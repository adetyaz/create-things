import { error, json, type RequestHandler } from '@sveltejs/kit';
import { DAILY_CRON, runDaily, runHourly } from '$lib/server/features/cron/service';

/**
 * POST /api/internal/cron { cron }: the scheduled jobs. The worker's scheduled() handler
 * (scripts/worker-entry.js) calls this in-process with a flag outside requests can't set.
 * The daily schedule syncs and writes the weekly memory; the hourly one sends email reminders.
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	if (platform?.env?.__FROM_CRON !== true) error(404);
	const { cron } = (await request.json().catch(() => ({}))) as { cron?: string };
	return json(cron === DAILY_CRON ? await runDaily(platform) : await runHourly(platform));
};
