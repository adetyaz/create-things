import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { syncInput } from '$lib/server/features/sources/input';
import { syncChannel } from '$lib/server/features/arena/service';
import { listCollections } from '$lib/server/features/collections/service';

/** POST /api/sources/arena/sync { collectionId? }: sync now (one channel, or all of yours). */
export const POST: RequestHandler = async (event) => {
	const { collectionId } = validate(syncInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	const ids = collectionId
		? [collectionId]
		: (await listCollections(event.platform, userId))
				.filter((c) => c.source === 'arena')
				.map((c) => c.id);
	const results = [];
	for (const id of ids) {
		results.push({ collectionId: id, ...(await syncChannel(event.platform, userId, id)) });
	}
	return json({ results });
};
