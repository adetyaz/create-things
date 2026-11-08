/**
 * Sign-in (Phase 0 #4): Google, or a magic link by email (Resend). Built per request on that
 * request's database client (Workers can't share connections between requests).
 *
 * Your existing data: everything made before sign-in belongs to the dev user. The first sign-in
 * with OWNER_EMAIL takes over that id, so it all carries over.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins/magic-link';
import type { Db } from '$lib/server/db';
import { account, session, user, verification } from '$lib/server/db/schema/auth';
import { optionalEnv, requiredEnv } from '$lib/server/platform/env';
import { DEV_USER_ID } from '$lib/server/platform/user';
import { sendEmail } from '$lib/server/features/email/service';

/** Whether sign-in can run: a secret, plus at least one way in. */
export function authReady(): boolean {
	return (
		!!optionalEnv('BETTER_AUTH_SECRET') &&
		(!!optionalEnv('GOOGLE_CLIENT_ID') || !!optionalEnv('RESEND_API_KEY'))
	);
}

export function makeAuth(db: Db, baseURL: string) {
	const google =
		optionalEnv('GOOGLE_CLIENT_ID') && optionalEnv('GOOGLE_CLIENT_SECRET')
			? {
					google: {
						clientId: requiredEnv('GOOGLE_CLIENT_ID'),
						clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET')
					}
				}
			: {};
	return betterAuth({
		baseURL,
		secret: requiredEnv('BETTER_AUTH_SECRET'),
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: { user, session, account, verification }
		}),
		socialProviders: google,
		session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
		plugins: [
			magicLink({
				expiresIn: 15 * 60,
				sendMagicLink: async ({ email, url }) => {
					await sendEmail(email, {
						subject: 'Your createthings sign-in link',
						html: `<p>Tap to sign in to createthings:</p><p><a href="${url}">Sign in</a></p><p style="color:#a8a29e;font-size:12px">The link works for 15 minutes. Didn't ask for it? Ignore this email.</p>`,
						text: `Sign in to createthings: ${url}\n\nThe link works for 15 minutes.`
					});
				}
			})
		],
		databaseHooks: {
			user: {
				create: {
					// The owner's first sign-in keeps everything made before sign-in existed.
					before: async (u) => {
						const owner = optionalEnv('OWNER_EMAIL')?.toLowerCase();
						if (owner && u.email.toLowerCase() === owner) {
							return { data: { ...u, id: optionalEnv('DEV_USER_ID') ?? DEV_USER_ID } };
						}
					}
				}
			}
		}
	});
}

export type Auth = ReturnType<typeof makeAuth>;
