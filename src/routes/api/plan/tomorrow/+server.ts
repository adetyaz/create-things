import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { rankTomorrowInput } from '$lib/server/features/plan/input';
import { rankTomorrow } from '$lib/server/features/plan/day';

/** POST /api/plan/tomorrow { stepIds: 1–3, most important first }: tomorrow's top 3 (Ivy Lee). */
export const POST: RequestHandler = async (event) => {
	const { stepIds } = validate(rankTomorrowInput, await event.request.json().catch(() => ({})));
	const result = await rankTomorrow(event.platform, currentUserId(event), stepIds);
	if (result.status === 'invalid') error(400, 'Steps must be your own and not done yet');
	return json(result);
};
