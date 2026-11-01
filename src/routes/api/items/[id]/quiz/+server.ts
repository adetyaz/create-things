import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { quizInput } from '$lib/server/features/cards/input';
import { makeQuiz } from '$lib/server/features/cards/service';

/** POST /api/items/[id]/quiz { milestone? }: a practice quiz (2 credits). */
export const POST: RequestHandler = async (event) => {
	const { milestone } = validate(quizInput, await event.request.json().catch(() => ({})));
	const quiz = await makeQuiz(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id),
		milestone
	);
	if (quiz.status === 'not_found') error(404, 'This item has no roadmap');
	if (quiz.status === 'nothing_to_quiz') error(400, 'Nothing to quiz on yet');
	return json(quiz);
};
