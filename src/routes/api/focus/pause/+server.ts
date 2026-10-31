import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { pauseInput } from '$lib/server/features/focus/input';
import { pause } from '$lib/server/features/focus/service';

/** POST /api/focus/pause { itemId }: move a Focus item back to the Shortlist, progress kept. */
export const POST: RequestHandler = async (event) => {
	const { itemId } = validate(pauseInput, await event.request.json().catch(() => ({})));
	const item = await pause(event.platform, currentUserId(event), itemId);
	if (!item) error(404, 'No Focus item with that id');
	return json({ item });
};
