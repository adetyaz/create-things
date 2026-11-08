import { json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { referencesForGoal } from '$lib/server/features/collections/service';

/** GET /api/items/[id]/references: references from collections linked to this goal. */
export const GET: RequestHandler = async (event) => {
	return json({
		references: await referencesForGoal(
			event.platform,
			currentUserId(event),
			uuidParam(event.params.id)
		)
	});
};
