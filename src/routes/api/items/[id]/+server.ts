import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getItemWithAnalysis } from '$lib/server/features/items/service';

/** GET /api/items/[id]: one item with its latest analysis (null until the job finishes). */
export const GET: RequestHandler = async (event) => {
	const id = uuidParam(event.params.id);
	const result = await getItemWithAnalysis(event.platform, currentUserId(event), id);
	if (!result) error(404, 'Item not found');
	return json(result);
};
