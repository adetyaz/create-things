import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { retryAnalysis } from '$lib/server/features/items/service';

/** POST /api/items/[id]/analyze: retry the analysis of an item still in the inbox. */
export const POST: RequestHandler = async (event) => {
	const id = uuidParam(event.params.id);
	const result = await retryAnalysis(event.platform, currentUserId(event), id);
	if (!result) {
		error(409, 'Only items still in the inbox can be re-analysed (or the item does not exist)');
	}
	return json(result, { status: 202 });
};
