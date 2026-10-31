import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { moveInput } from '$lib/server/features/plan/input';
import { moveSlot, removeSlot } from '$lib/server/features/plan/reshuffle';

/** PATCH /api/plan/slots/[id] { day?, startTime? | anchor?, place? }: move a block. */
export const PATCH: RequestHandler = async (event) => {
	const move = validate(moveInput, await event.request.json().catch(() => ({})));
	const moved = await moveSlot(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		move
	);
	if (!moved) error(404, 'No block with that id');
	return json({ moved });
};

/** DELETE /api/plan/slots/[id]: unplan a block; its step stays in the roadmap. */
export const DELETE: RequestHandler = async (event) => {
	const removed = await removeSlot(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (!removed) error(404, 'No block with that id');
	return json({ removed });
};
