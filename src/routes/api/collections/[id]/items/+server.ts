import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { addItemsInput } from '$lib/server/features/collections/input';
import { addItems } from '$lib/server/features/collections/service';

/** POST /api/collections/[id]/items { itemIds }: add your items to it. */
export const POST: RequestHandler = async (event) => {
	const { itemIds } = validate(addItemsInput, await event.request.json().catch(() => ({})));
	const ok = await addItems(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		itemIds
	);
	if (!ok) error(404, 'No collection with that id');
	return json({ added: itemIds.length });
};
