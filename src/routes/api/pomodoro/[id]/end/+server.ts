import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { endInput } from '$lib/server/features/pomodoro/input';
import { endSession } from '$lib/server/features/pomodoro/service';

/**
 * POST /api/pomodoro/[id]/end { note? }: end the session. A full one is a meal for the pet, 10+
 * minutes a snack; the note goes into the journal → { session, minutes, fed }.
 */
export const POST: RequestHandler = async (event) => {
	const { note } = validate(endInput, await event.request.json().catch(() => ({})));
	const result = await endSession(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		note
	);
	if (result.status === 'not_found') error(404, 'No session with that id');
	return json(result);
};
