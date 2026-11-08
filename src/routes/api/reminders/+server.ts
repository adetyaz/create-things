import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { checkReminders } from '$lib/server/features/reminders/service';

/**
 * GET /api/reminders?channel=extension: what's due now (new ones are saved within the daily limit,
 * quiet hours and busy times) → { fresh, open, held, limit }. `fresh` are marked shown on `channel`.
 */
export const GET: RequestHandler = async (event) => {
	const channel = event.url.searchParams.get('channel') ?? 'app';
	return json(await checkReminders(event.platform, currentUserId(event), channel.slice(0, 20)));
};
