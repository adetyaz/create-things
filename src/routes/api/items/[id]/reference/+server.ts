import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { referenceInput } from '$lib/server/features/items/input';
import { setReference } from '$lib/server/features/items/service';

/** PUT /api/items/[id]/reference { reference }: keep a fresh save as a reference, or make it a to-do. */
export const PUT: RequestHandler = async (event) => {
	const { reference } = validate(referenceInput, await event.request.json().catch(() => ({})));
	const item = await setReference(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		reference
	);
	if (!item) error(409, 'Only new saves (inbox, ready or reference) can be switched');
	return json({ item });
};
