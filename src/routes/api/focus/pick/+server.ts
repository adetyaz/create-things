import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { pickInput } from '$lib/server/features/focus/input';
import { pickForMe } from '$lib/server/features/focus/pick';

/** POST /api/focus/pick { minutes: 15|30|60, energy, exclude? }: one Shortlist item, with why. */
export const POST: RequestHandler = async (event) => {
	const input = validate(pickInput, await event.request.json().catch(() => ({})));
	return json(await pickForMe(event.platform, currentUserId(event), input));
};
