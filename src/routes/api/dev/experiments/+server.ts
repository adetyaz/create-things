import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { z } from 'zod';
import { optionalEnv } from '$lib/server/platform/env';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { forceVariant, results } from '$lib/server/features/experiments/service';

const forceInput = z.object({ experiment: z.string(), variant: z.string() });

function guard() {
	if (!dev && optionalEnv('DEV_CHECKS') !== '1') error(404);
}

/** GET /api/dev/experiments: results per experiment and variant (users, outcomes reached). */
export const GET: RequestHandler = async (event) => {
	guard();
	return json({ experiments: await results(event.platform) });
};

/** PUT /api/dev/experiments { experiment, variant }: try a variant by hand. */
export const PUT: RequestHandler = async (event) => {
	guard();
	const { experiment, variant } = validate(
		forceInput,
		await event.request.json().catch(() => ({}))
	);
	if (!(await forceVariant(event.platform, currentUserId(event), experiment, variant))) {
		error(400, 'Unknown experiment or variant');
	}
	return json({ experiment, variant });
};
