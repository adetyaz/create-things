import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { optionalEnv } from '$lib/server/platform/env';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { lastFedInput } from '$lib/server/features/pet/input';
import { getPet, setLastFed } from '$lib/server/features/pet/service';

/**
 * POST /api/dev/pet { "daysAgo": 8 }: pretend the last meal was that long ago, to see the moods.
 * Only on in `vite dev`, or under `wrangler dev` with DEV_CHECKS=1.
 */
export const POST: RequestHandler = async (event) => {
	if (!dev && optionalEnv('DEV_CHECKS') !== '1') error(404);
	const { daysAgo } = validate(lastFedInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	if (!(await setLastFed(event.platform, userId, daysAgo))) error(404, 'No pet yet');
	return json({ pet: await getPet(event.platform, userId) });
};
