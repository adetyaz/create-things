import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { completeStep } from '$lib/server/features/roadmap/service';

/** POST /api/steps/[id]/complete: mark a step done; finishing a milestone re-plans the rest. */
export const POST: RequestHandler = async (event) => {
	const result = await completeStep(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (result.status === 'not_found') error(404, 'No step with that id');
	return json(result);
};
