import { json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { suggestNext } from '$lib/server/features/next/service';

/** GET /api/items/[id]/next: what to do after this item and what carries over (1 credit). */
export const GET: RequestHandler = async (event) => {
	const next = await suggestNext(event.platform, currentUserId(event), uuidParam(event.params.id));
	return json({ next });
};
