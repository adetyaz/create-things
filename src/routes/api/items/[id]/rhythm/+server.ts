import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { itemRhythmInput } from '$lib/server/features/onboarding/input';
import { setItemRhythm } from '$lib/server/features/templates/service';

/** PUT /api/items/[id]/rhythm { rhythm | null }: this goal's own check-in rhythm (null: yours). */
export const PUT: RequestHandler = async (event) => {
	const { rhythm } = validate(itemRhythmInput, await event.request.json().catch(() => ({})));
	const ok = await setItemRhythm(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		rhythm
	);
	if (!ok) error(404, 'No item with that id');
	return json({ rhythm });
};
