import type { RequestHandler } from '@sveltejs/kit';
import { finishConnect, OAUTH_COOKIE } from '$lib/server/features/sources/service';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function page(title: string, body: string) {
	return new Response(
		`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1 style="font-size:1.25rem">${escape(title)}</h1><p>${escape(body)}</p></body>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
}

/** GET /api/sources/[source]/callback: where the site sends you back; saves the connection. */
export const GET: RequestHandler = async (event) => {
	const result = await finishConnect(
		event.platform,
		event.params.source!,
		event.url.origin,
		event.url.searchParams,
		event.cookies.get(OAUTH_COOKIE)
	);
	event.cookies.delete(OAUTH_COOKIE, { path: '/api/sources' });
	return result.status === 'connected'
		? page(
				`${result.source.label} is connected`,
				'You can close this tab and go back to createthings.'
			)
		: page('Not connected', result.message);
};
