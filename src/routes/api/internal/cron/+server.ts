import { error, json, type RequestHandler } from '@sveltejs/kit';
import { DAILY_CRON, runDaily, runHourly } from '$lib/server/features/cron/service';
import { optionalEnv } from '$lib/server/platform/env';

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

/**
 * GET /api/internal/cron?run=daily|hourly: the same jobs from Vercel Cron (vercel.json), which
 * sends `Authorization: Bearer <CRON_SECRET>`. Anything else gets a 404.
 */
export const GET: RequestHandler = async ({ platform, request, url }) => {
	const secret = optionalEnv('CRON_SECRET');
	if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) error(404);
	return json(
		url.searchParams.get('run') === 'daily' ? await runDaily(platform) : await runHourly(platform)
	);
};
