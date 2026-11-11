import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { withDb } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';

/**
 * PUT /api/settings/focus { limit: 1–3 }: how many things you work on at once (Cal Newport's
 * "do fewer things": 1 by default). Starting more than this asks you to pause one first.
 */
export const PUT: RequestHandler = async (event) => {
	const { limit } = validate(
		z.object({ limit: z.number().int().min(1).max(3) }),
		await event.request.json().catch(() => ({}))
	);
	const userId = currentUserId(event);
	await withDb(event.platform, (db) =>
		db
			.insert(userSettings)
			.values({ userId, focusLimit: limit })
			.onConflictDoUpdate({ target: userSettings.userId, set: { focusLimit: limit } })
	);
	return json({ limit });
};
