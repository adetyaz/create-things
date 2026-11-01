import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { finishItem } from '$lib/server/features/next/service';

/** POST /api/items/[id]/finish { note? }: mark done, remember what it built, suggest what's next. */
export const POST: RequestHandler = async (event) => {
	const { note } = validate(
		z.object({ note: z.string().trim().max(1000).optional() }),
		await event.request.json().catch(() => ({}))
	);
	const result = await finishItem(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		note
	);
	if (result.status === 'not_found') error(404, 'No open item with that id');
	return json(result);
};
