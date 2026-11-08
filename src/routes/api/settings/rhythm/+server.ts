import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { rhythmUpdateInput } from '$lib/server/features/onboarding/input';
import { getRhythm, setRhythm } from '$lib/server/features/templates/service';

/** GET /api/settings/rhythm: your templates, check-in rhythm, reviews, pet timeline, in plain words. */
export const GET: RequestHandler = async (event) => {
	return json(await getRhythm(event.platform, currentUserId(event)));
};

/** PUT /api/settings/rhythm { templates?, rhythm?, reviews?, hungerMode?, leniency? }. */
export const PUT: RequestHandler = async (event) => {
	const update = validate(rhythmUpdateInput, await event.request.json().catch(() => ({})));
	return json(await setRhythm(event.platform, currentUserId(event), update));
};
