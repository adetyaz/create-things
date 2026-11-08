import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { proposeWeekInput, saveWeekInput } from '$lib/server/features/plan/input';
import { proposeWeek, saveWeek } from '$lib/server/features/plan/week';
import { clashesFor } from '$lib/server/features/calendar/service';

/**
 * POST /api/plan/week { blocks: [{ day, startTime? | anchor?, place? }] }: the pet's filled week.
 * `clashes[i]` flags block i landing on a busy time in the user's calendar.
 */
export const POST: RequestHandler = async (event) => {
	const { blocks } = validate(proposeWeekInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	const proposal = await proposeWeek(event.platform, userId, blocks);
	const clashes = await clashesFor(
		event.platform,
		userId,
		proposal.blocks.map((b) => ({ ...b, minutes: b.step?.minutes ?? 25 }))
	);
	return json({ ...proposal, clashes });
};

/** PUT /api/plan/week { blocks: [{ day, startTime? | anchor?, place?, stepId }] }: save the week. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(saveWeekInput, await event.request.json().catch(() => ({})));
	const result = await saveWeek(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(400, 'Every block needs one of your roadmap steps');
	return json(result);
};
