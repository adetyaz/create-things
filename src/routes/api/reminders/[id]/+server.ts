import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { actInput } from '$lib/server/features/reminders/input';
import { actOnReminder } from '$lib/server/features/reminders/service';

/**
 * POST /api/reminders/[id] { action }: done (marks the step done; feeds the pet), move (block to
 * tomorrow), start / two_minute / open / dismiss (recorded).
 */
export const POST: RequestHandler = async (event) => {
	const { action } = validate(actInput, await event.request.json().catch(() => ({})));
	const result = await actOnReminder(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		action
	);
	if (result.status === 'not_found') error(404, 'No reminder with that id');
	if (result.status === 'invalid') error(409, result.message);
	return json(result);
};
