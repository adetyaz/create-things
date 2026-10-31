import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { z } from 'zod';
import { optionalEnv } from '$lib/server/platform/env';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getCreditSummary, grantCredits } from '$lib/server/features/credits/service';

const grantInput = z.object({ amount: z.number().int().min(1).max(10_000) });

/**
 * POST /api/dev/credits { "amount": 50 }: grant test credits to the dev user.
 * Only on in `vite dev`, or under `wrangler dev` with DEV_CHECKS=1.
 */
export const POST: RequestHandler = async (event) => {
	if (!dev && optionalEnv('DEV_CHECKS') !== '1') error(404);
	const { amount } = validate(grantInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	await grantCredits(event.platform, userId, amount, 'grant', 'dev grant');
	return json(await getCreditSummary(event.platform, userId));
};
