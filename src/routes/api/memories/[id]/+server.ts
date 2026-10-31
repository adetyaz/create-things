import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { deleteMemory } from '$lib/server/features/memory/service';

/** DELETE /api/memories/[id]: the pet stops using it (Walrus can't erase; see Breakdown §13). */
export const DELETE: RequestHandler = async (event) => {
	const result = await deleteMemory(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (result.status === 'not_found') error(404, 'No memory with that id');
	return json(result);
};
