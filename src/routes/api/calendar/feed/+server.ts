import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { feedInput } from '$lib/server/features/calendar/input';
import { feedToken } from '$lib/server/features/calendar/service';

/**
 * POST /api/calendar/feed { rotate? }: your private calendar link for your blocks (subscribe to it
 * in Google, Apple or Outlook). `rotate` makes a new one; the old link stops working.
 */
export const POST: RequestHandler = async (event) => {
	const { rotate } = validate(feedInput, await event.request.json().catch(() => ({})));
	const token = await feedToken(event.platform, currentUserId(event), rotate ?? false);
	const feedUrl = `${event.url.origin}/api/calendar/feed/${token}.ics`;
	return json({ feedUrl, webcal: feedUrl.replace(/^https?:/, 'webcal:') });
};
