import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { weekDigest } from '$lib/server/features/digest/service';

/** GET /api/digest?to=YYYY-MM-DD: the 7 days ending that day (default today), in plain words. */
export const GET: RequestHandler = async (event) => {
	const to = event.url.searchParams.get('to');
	return json(
		await weekDigest(
			event.platform,
			currentUserId(event),
			to ? validate(z.iso.date(), to) : undefined
		)
	);
};
