import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { createInput } from '$lib/server/features/collections/input';
import { createCollection, listCollections } from '$lib/server/features/collections/service';

/** GET /api/collections: boards, channels, folders and app collections, with counts. */
export const GET: RequestHandler = async (event) => {
	return json({ collections: await listCollections(event.platform, currentUserId(event)) });
};

/** POST /api/collections { title, itemIds? }: make one in the app. */
export const POST: RequestHandler = async (event) => {
	const { title, itemIds } = validate(createInput, await event.request.json().catch(() => ({})));
	return json(
		{ collection: await createCollection(event.platform, currentUserId(event), title, itemIds) },
		{ status: 201 }
	);
};
