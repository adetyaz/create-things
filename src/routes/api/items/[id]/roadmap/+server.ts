import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getRoadmap, requestRoadmap } from '$lib/server/features/roadmap/service';

/** GET /api/items/[id]/roadmap: milestones, steps and the current step, or `roadmap: null`. */
export const GET: RequestHandler = async (event) => {
	const roadmap = await getRoadmap(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	return json({ roadmap });
};

/** POST /api/items/[id]/roadmap: plan (or re-plan from scratch) this item's roadmap. */
export const POST: RequestHandler = async (event) => {
	const itemId = uuidParam(event.params.id);
	const delivery = await requestRoadmap(event.platform, currentUserId(event), itemId);
	if (!delivery) error(404, 'No item with that id');
	return json({ itemId, delivery }, { status: 202 });
};
