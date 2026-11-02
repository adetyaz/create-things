import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { createToken, listTokens } from '$lib/server/features/devices/service';

/** GET /api/extension/token: connected devices (never the tokens themselves). */
export const GET: RequestHandler = async (event) => {
	return json({ devices: await listTokens(event.platform, currentUserId(event)) });
};

/** POST /api/extension/token { label? }: a new connection token, shown once. */
export const POST: RequestHandler = async (event) => {
	const { label } = validate(
		z.object({ label: z.string().trim().min(1).max(60).default('Browser extension') }),
		await event.request.json().catch(() => ({}))
	);
	return json(await createToken(event.platform, currentUserId(event), label), { status: 201 });
};
