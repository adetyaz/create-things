import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { saveCardsInput } from '$lib/server/features/journal/input';
import { draftCards, saveCards } from '$lib/server/features/journal/service';

/** GET /api/journal/[id]/cards: 1–3 flashcard drafts from the entry (1 credit; nothing saved). */
export const GET: RequestHandler = async (event) => {
	const result = await draftCards(event.platform, currentUserId(event), uuidParam(event.params.id));
	if (result.status === 'not_found') error(404, 'No entry with that id');
	return json(result);
};

/** POST /api/journal/[id]/cards { cards }: save the approved cards (due tomorrow); a snack. */
export const POST: RequestHandler = async (event) => {
	const { cards } = validate(saveCardsInput, await event.request.json().catch(() => ({})));
	const result = await saveCards(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		cards
	);
	if (result.status === 'not_found') error(404, 'No entry with that id');
	return json(result);
};
