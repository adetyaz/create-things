import type { HandleServerError } from '@sveltejs/kit';

/** Logs the real cause of unexpected errors; the client still only sees the generic message. */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error(`[${status}] ${event.request.method} ${event.url.pathname}:`, error);
	return { message };
};
