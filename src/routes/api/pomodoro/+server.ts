import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { startInput } from '$lib/server/features/pomodoro/input';
import { openSession, startSession } from '$lib/server/features/pomodoro/service';

/** GET /api/pomodoro: the open session, if any (to resume the timer). */
export const GET: RequestHandler = async (event) => {
	return json({ session: await openSession(event.platform, currentUserId(event)) });
};

/** POST /api/pomodoro { stepId? }: start a session → { session, minutes } (the focus length). */
export const POST: RequestHandler = async (event) => {
	const { stepId } = validate(startInput, await event.request.json().catch(() => ({})));
	const result = await startSession(event.platform, currentUserId(event), stepId);
	if (result.status === 'invalid') error(404, result.message);
	return json(result, { status: 201 });
};
