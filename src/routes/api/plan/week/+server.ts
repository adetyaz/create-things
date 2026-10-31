import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { proposeWeekInput, saveWeekInput } from '$lib/server/features/plan/input';
import { proposeWeek, saveWeek } from '$lib/server/features/plan/week';

/** POST /api/plan/week { blocks: [{ day, startTime? | anchor?, place? }] }: the pet's filled week. */
export const POST: RequestHandler = async (event) => {
	const { blocks } = validate(proposeWeekInput, await event.request.json().catch(() => ({})));
	return json(await proposeWeek(event.platform, currentUserId(event), blocks));
};

/** PUT /api/plan/week { blocks: [{ day, startTime? | anchor?, place?, stepId }] }: save the week. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(saveWeekInput, await event.request.json().catch(() => ({})));
	const result = await saveWeek(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(400, 'Every block needs one of your roadmap steps');
	return json(result);
};
