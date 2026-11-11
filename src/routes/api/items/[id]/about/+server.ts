import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { aboutInput, saveAbout } from '$lib/server/features/items/about';

/**
 * PUT /api/items/[id]/about { goal?, targetDate?, answers: [{ q, a }], units? }: what the user
 * says about a thing before it's planned (free). The roadmap reads all of it.
 */
export const PUT: RequestHandler = async (event) => {
	const input = validate(aboutInput, await event.request.json().catch(() => ({})));
	const result = await saveAbout(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		input
	);
	if (result.status === 'not_found') error(404, 'No item with that id');
	return json(result);
};
