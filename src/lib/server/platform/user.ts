import { error, type RequestEvent } from '@sveltejs/kit';
import { optionalEnv } from './env';

/** The user everything belonged to before sign-in; the owner's first sign-in takes this id over. */
export const DEV_USER_ID = 'dev-user';

/** REQUIRE_SIGN_IN=true: every request needs a session or a device token (production). */
export function signInRequired(): boolean {
	return optionalEnv('REQUIRE_SIGN_IN') === 'true';
}

/**
 * The signed-in user's id. Every route gets the user from here: the sign-in session or a device
 * connection token (set in hooks.server.ts). Until sign-in is switched on, the dev user.
 */
export function currentUserId(event: RequestEvent): string {
	if (event.locals.userId) return event.locals.userId;
	if (signInRequired()) error(401, 'Sign in first');
	return optionalEnv('DEV_USER_ID') ?? DEV_USER_ID;
}
