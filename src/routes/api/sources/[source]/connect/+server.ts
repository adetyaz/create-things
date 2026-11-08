import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { sourceOf } from '$lib/server/features/sources/registry';
import { configured, OAUTH_COOKIE, startConnect } from '$lib/server/features/sources/service';

/** GET /api/sources/[source]/connect: off to the site to say yes (OAuth with PKCE). */
export const GET: RequestHandler = async (event) => {
	const source = sourceOf(event.params.source!);
	if (!source) error(404, 'Unknown account type');
	if (!configured(source)) {
		error(503, `${source.label} isn't set up yet: its keys are missing (needs-input.md)`);
	}
	const { url, cookie } = await startConnect(source, currentUserId(event), event.url.origin);
	event.cookies.set(OAUTH_COOKIE, cookie, {
		path: '/api/sources',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: 15 * 60
	});
	redirect(302, url);
};
