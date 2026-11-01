import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { chatInput } from '$lib/server/features/chat/input';
import { chat } from '$lib/server/features/chat/service';

/** POST /api/chat { mode: chat | stuck | teach, itemId?, stepId?, messages }: talk to the pet. */
export const POST: RequestHandler = async (event) => {
	const input = validate(chatInput, await event.request.json().catch(() => ({})));
	const result = await chat(event.platform, currentUserId(event), input);
	if (!result) error(404, 'No item with that id');
	return json(result);
};
