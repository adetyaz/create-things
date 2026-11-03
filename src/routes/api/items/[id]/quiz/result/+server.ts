import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { quizResultInput } from '$lib/server/features/cards/input';
import { recordQuiz } from '$lib/server/features/cards/service';
import { feedQuietly, userToday } from '$lib/server/features/pet/service';

/** POST /api/items/[id]/quiz/result { total, wrong[] }: wrong answers → flashcards + a memory. */
export const POST: RequestHandler = async (event) => {
	const input = validate(quizResultInput, await event.request.json().catch(() => ({})));
	const result = await recordQuiz(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		input
	);
	if (!result) error(404, 'No item with that id');
	// A practice quiz is a snack for the pet (once per item a day).
	const userId = currentUserId(event);
	const itemId = uuidParam(event.params.id);
	const fed = await feedQuietly(
		event.platform,
		userId,
		{ type: 'quiz', itemId, day: await userToday(event.platform, userId) },
		'snack'
	);
	return json({ ...result, fed });
};
