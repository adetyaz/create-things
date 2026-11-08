import { json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { userForToken } from '$lib/server/features/devices/service';
import { syncGoogleQuietly } from '$lib/server/features/calendar/google';
import { currentUserId } from '$lib/server/platform/user';

/**
 * Requests from the browser extension carry a device connection token (until sign-in exists).
 * A valid token sets the user; an invalid one is refused, so the extension knows to reconnect.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const header = event.request.headers.get('authorization');
	if (header?.startsWith('Bearer ') && event.url.pathname.startsWith('/api/')) {
		const userId = await userForToken(event.platform, header.slice(7).trim());
		if (!userId)
			return json({ message: 'This connection token is unknown or revoked' }, { status: 401 });
		event.locals.userId = userId;
	}
	const response = await resolve(event);

	// A plan change (week saved, block moved or dropped, reshuffle, tomorrow's top 3) updates the
	// user's Google Calendar events, if connected; it never slows down or fails the change itself.
	if (
		response.ok &&
		event.request.method !== 'GET' &&
		event.url.pathname.startsWith('/api/plan/') &&
		event.url.pathname !== '/api/plan/fit'
	) {
		const sync = syncGoogleQuietly(event.platform, currentUserId(event));
		if (event.platform?.ctx?.waitUntil) event.platform.ctx.waitUntil(sync);
		else void sync;
	}
	return response;
};

/** Logs the real cause of unexpected errors; the client still only sees the generic message. */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[${status}] ${event.request.method} ${event.url.pathname}:`, error);
	return { message };
};
