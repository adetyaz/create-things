import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { confirmInput } from '$lib/server/features/intents/input';
import { confirmUnderstanding, getUnderstanding } from '$lib/server/features/intents/understanding';

/** GET /api/items/[id]/understanding: the confirm card (intent, practice kind, goal, date, choices). */
export const GET: RequestHandler = async (event) => {
	const card = await getUnderstanding(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (!card) error(404, 'No item with that id');
	return json(card);
};

/** PUT /api/items/[id]/understanding { intent?, practiceKind?, goal?, targetDate? }: confirm or change. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(confirmInput, await event.request.json().catch(() => ({})));
	const result = await confirmUnderstanding(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		input
	);
	if (!result) error(404, 'No item with that id');
	return json(result);
};
