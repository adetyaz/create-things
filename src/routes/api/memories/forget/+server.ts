import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { forgetAll } from '$lib/server/features/memory/service';

/** POST /api/memories/forget { confirm: true }: forget everything (a fresh, empty namespace). */
export const POST: RequestHandler = async (event) => {
	const { confirm } = validate(
		z.object({ confirm: z.boolean() }),
		await event.request.json().catch(() => ({}))
	);
	if (!confirm) error(400, 'Send { "confirm": true } to forget everything');
	return json(await forgetAll(event.platform, currentUserId(event)));
};
