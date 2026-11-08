import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { shareInput } from '$lib/server/features/sources/input';
import { shareBack } from '$lib/server/features/arena/service';

/** POST /api/sources/arena/share { itemId, description? }: add what you made (after your OK). */
export const POST: RequestHandler = async (event) => {
	const { itemId, description } = validate(
		shareInput,
		await event.request.json().catch(() => ({}))
	);
	const result = await shareBack(event.platform, currentUserId(event), itemId, description);
	if (result.status === 'not_found') error(404, 'No item with that id');
	if (result.status === 'off') error(409, result.message);
	return json(result);
};
