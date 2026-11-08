import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { refreshGoogleBusy, syncGoogleEvents } from '$lib/server/features/calendar/google';

/**
 * POST /api/calendar/google/sync: write the next two weeks of blocks to Google Calendar now (with
 * 10-minute alerts) and read busy times. Connect first at /api/sources/google_calendar/connect.
 */
export const POST: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const events = await syncGoogleEvents(event.platform, userId);
	const busy = await refreshGoogleBusy(event.platform, userId);
	return json({ events, busy });
};
