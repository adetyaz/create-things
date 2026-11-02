import { optionalEnv } from './env';
import type { RequestEvent } from '@sveltejs/kit';

/** Stand-in user until auth lands (Phase 0 #4, near the end of the build). */
export const DEV_USER_ID = 'dev-user';

/**
 * The signed-in user's id. Every route gets the user from here, so adding Better Auth later
 * changes this one function: read the session from `event`, throw 401 when there is none.
 */
export function currentUserId(event: RequestEvent): string {
	// A device connection token (the extension) names the user; otherwise the dev user.
	return event.locals.userId ?? optionalEnv('DEV_USER_ID') ?? DEV_USER_ID;
}
