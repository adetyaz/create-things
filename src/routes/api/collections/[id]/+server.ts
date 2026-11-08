import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { updateInput } from '$lib/server/features/collections/input';
import { getCollection, updateCollection } from '$lib/server/features/collections/service';

/** GET /api/collections/[id]: the collection and what's in it. */
export const GET: RequestHandler = async (event) => {
	const result = await getCollection(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (!result) error(404, 'No collection with that id');
	return json(result);
};

/** PUT /api/collections/[id] { title?, mode?, goalItemId? }: rename, or link it to a goal. */
export const PUT: RequestHandler = async (event) => {
	const update = validate(updateInput, await event.request.json().catch(() => ({})));
	const row = await updateCollection(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		update
	);
	if (!row) error(404, 'No such collection (or goal)');
	return json({ collection: row });
};
