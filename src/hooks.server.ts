import { json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { userForToken } from '$lib/server/features/devices/service';

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
	return resolve(event);
};

/** Logs the real cause of unexpected errors; the client still only sees the generic message. */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[${status}] ${event.request.method} ${event.url.pathname}:`, error);
	return { message };
};
