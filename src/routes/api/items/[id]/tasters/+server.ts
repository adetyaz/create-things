import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { tasterInput } from '$lib/server/features/roadmap/input';
import { decideAfterTasters } from '$lib/server/features/roadmap/tasters';

/** POST /api/items/[id]/tasters { choice: keep | park | let_go, intent?, until?, note? }. */
export const POST: RequestHandler = async (event) => {
	const input = validate(tasterInput, await event.request.json().catch(() => ({})));
	const result = await decideAfterTasters(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		input
	);
	if (result.status === 'not_found') error(404, 'No item with that id');
	return json(result);
};
