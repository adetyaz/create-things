import { error, type RequestEvent } from '@sveltejs/kit';
import { optionalEnv } from './env';

/** The user everything belonged to before sign-in; the owner's first sign-in takes this id over. */
export const DEV_USER_ID = 'dev-user';

/** REQUIRE_SIGN_IN=true: every request needs a session or a device token (production). */
export function signInRequired(): boolean {
	return optionalEnv('REQUIRE_SIGN_IN') === 'true';
}

/**
 * Local runs without sign-in only: the demo recording (scripts/record-demo.mjs) sends this header
 * to act as a fresh, empty user. Ignored whenever sign-in is required, as it is in production.
 */
const DEMO_USER_HEADER = 'x-demo-user';

/**
 * The signed-in user's id. Every route gets the user from here: the sign-in session or a device
 * connection token (set in hooks.server.ts). Until sign-in is switched on, the dev user.
 */
export function currentUserId(event: RequestEvent): string {
	if (event.locals.userId) return event.locals.userId;
	if (signInRequired()) error(401, 'Sign in first');
	const demo = event.request.headers.get(DEMO_USER_HEADER)?.trim();
	if (demo && /^demo-[a-z0-9-]{1,40}$/.test(demo)) return demo;
	return optionalEnv('DEV_USER_ID') ?? DEV_USER_ID;
}
