import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { groupMemories, listMemories } from '$lib/server/features/memory/service';

/** GET /api/memories: what the pet remembers, newest first, also grouped in plain words. */
export const GET: RequestHandler = async (event) => {
	const memories = await listMemories(event.platform, currentUserId(event));
	return json({ memories, groups: groupMemories(memories) });
};
