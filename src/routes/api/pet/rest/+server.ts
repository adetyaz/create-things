import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { restInput } from '$lib/server/features/onboarding/input';
import { setRest } from '$lib/server/features/templates/service';
import { getPet } from '$lib/server/features/pet/service';

/** PUT /api/pet/rest { until: YYYY-MM-DD | null }: pause hunger for holidays or sick days. */
export const PUT: RequestHandler = async (event) => {
	const { until } = validate(restInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	await setRest(event.platform, userId, until);
	return json({ pet: await getPet(event.platform, userId) });
};
