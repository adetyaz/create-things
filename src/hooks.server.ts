import { json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { userForToken } from '$lib/server/features/devices/service';
import { syncGoogleQuietly } from '$lib/server/features/calendar/google';
import { authReady, makeAuth } from '$lib/server/features/auth/auth';
import { withDb } from '$lib/server/db';
import { currentUserId } from '$lib/server/platform/user';

/** Better Auth's session cookie (with a __Secure- prefix over https). */
const hasSessionCookie = (cookies: { name: string }[]) =>
	cookies.some((c) => c.name.endsWith('better-auth.session_token'));

/**
 * Who's asking: the browser extension sends a device connection token; the app sends the sign-in
 * session cookie. Sign-in's own routes (/api/auth/*) are answered by Better Auth.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth/')) {
		if (!authReady()) return json({ message: 'Sign-in is not set up yet' }, { status: 503 });
		return withDb(event.platform, (db) => makeAuth(db, event.url.origin).handler(event.request));
	}

	// MPP clients put their payment in Authorization, so they send the token as x-createthings-token.
	const header = event.request.headers.get('authorization');
	const token = header?.startsWith('Bearer ')
		? header.slice(7).trim()
		: event.request.headers.get('x-createthings-token')?.trim();
	if (token && event.url.pathname.startsWith('/api/')) {
		const userId = await userForToken(event.platform, token);
		if (!userId)
			return json({ message: 'This connection token is unknown or revoked' }, { status: 401 });
		event.locals.userId = userId;
	} else if (authReady() && hasSessionCookie(event.cookies.getAll())) {
		const session = await withDb(event.platform, (db) =>
			makeAuth(db, event.url.origin).api.getSession({ headers: event.request.headers })
		).catch(() => null);
		if (session) event.locals.userId = session.user.id;
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
