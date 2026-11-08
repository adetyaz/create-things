import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { completeInput } from '$lib/server/features/onboarding/input';
import { completeOnboarding, onboardingFor } from '$lib/server/features/onboarding/service';

/** GET /api/onboarding: done?, how to ask (variant), templates, species with sample lines, defaults. */
export const GET: RequestHandler = async (event) => {
	return json(await onboardingFor(event.platform, currentUserId(event)));
};

/**
 * POST /api/onboarding { templates, rhythm?, reviews?, leniency?, hungerMode?, tone?, pet?,
 * brainDump? }: saves it all, adopts the pet, saves the brain dump → { rhythm, pet, saved }.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(completeInput, await event.request.json().catch(() => ({})));
	return json(await completeOnboarding(event.platform, currentUserId(event), input));
};
