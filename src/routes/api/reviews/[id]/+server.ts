import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { rateInput } from '$lib/server/features/cards/input';
import { rateCard } from '$lib/server/features/cards/service';

/** POST /api/reviews/[id] { rating: got_it | shaky | forgot }: set the card's next review date. */
export const POST: RequestHandler = async (event) => {
	const { rating } = validate(rateInput, await event.request.json().catch(() => ({})));
	const card = await rateCard(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		rating
	);
	if (!card) error(404, 'No card with that id');
	return json({ card });
};
