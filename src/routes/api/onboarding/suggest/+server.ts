import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { suggestInput } from '$lib/server/features/onboarding/input';
import { suggestTemplates } from '$lib/server/features/onboarding/service';

/** POST /api/onboarding/suggest { sentence }: suggested user types (free). */
export const POST: RequestHandler = async (event) => {
	const { sentence } = validate(suggestInput, await event.request.json().catch(() => ({})));
	return json(await suggestTemplates(event.platform, sentence));
};
