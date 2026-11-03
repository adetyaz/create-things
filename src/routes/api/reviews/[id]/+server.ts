import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { rateInput } from '$lib/server/features/cards/input';
import { dueCards, rateCard } from '$lib/server/features/cards/service';
import { feedQuietly, userToday } from '$lib/server/features/pet/service';

/**
 * POST /api/reviews/[id] { rating: got_it | shaky | forgot }: set the card's next review date.
 * The last of today's reviews feeds the pet a snack.
 */
export const POST: RequestHandler = async (event) => {
	const { rating } = validate(rateInput, await event.request.json().catch(() => ({})));
	const card = await rateCard(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		rating
	);
	if (!card) error(404, 'No card with that id');
	// Finishing today's reviews is a snack for the pet (once a day).
	const userId = currentUserId(event);
	const { cards } = await dueCards(event.platform, userId);
	const fed = cards.length
		? null
		: await feedQuietly(
				event.platform,
				userId,
				{ type: 'reviews', day: await userToday(event.platform, userId) },
				'snack'
			);
	return json({ card, reviewsLeft: cards.length, fed });
};
