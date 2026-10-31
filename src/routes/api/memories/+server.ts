import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { listMemories } from '$lib/server/features/memory/service';

/** GET /api/memories: what the pet remembers, newest first, with each memory's delivery status. */
export const GET: RequestHandler = async (event) => {
	return json({ memories: await listMemories(event.platform, currentUserId(event)) });
};
