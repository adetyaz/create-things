import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { importInput } from '$lib/server/features/imports/input';
import { importBatch } from '$lib/server/features/imports/service';

/**
 * POST /api/imports { source, collection: { externalId?, title }, items: [{ url, externalId,
 * title?, text? }] }: up to 50 at a time, as references without analysis (free); no duplicates.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(importInput, await event.request.json().catch(() => ({})));
	return json(await importBatch(event.platform, currentUserId(event), input));
};
