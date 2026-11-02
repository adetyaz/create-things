import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getItemWithAnalysis, undoCapture } from '$lib/server/features/items/service';

/** GET /api/items/[id]: one item with its latest analysis (null until the job finishes). */
export const GET: RequestHandler = async (event) => {
	const id = uuidParam(event.params.id);
	const result = await getItemWithAnalysis(event.platform, currentUserId(event), id);
	if (!result) error(404, 'Item not found');
	return json(result);
};

/** DELETE /api/items/[id]: undo a save (the extension's toast); hides any memory it made. */
export const DELETE: RequestHandler = async (event) => {
	const result = await undoCapture(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (!result)
		error(409, 'Only new saves (inbox, ready or reference) can be undone; archive the rest');
	return json(result);
};
