import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { createToken } from '$lib/server/features/devices/service';

const page = (title: string, script: string) =>
	new Response(
		`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1 style="font-size:1.25rem" id="t">${title}</h1><p id="m">One moment…</p><script>${script}</script></body>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
	);

/**
 * GET /api/extension/link?ext=<extension id>: "Sign in with createthings" from the extension. Not
 * signed in → the sign-in page first. Signed in → a new device token goes straight to the extension
 * (nothing to copy), and the tab says so.
 */
export const GET: RequestHandler = async (event) => {
	const ext = event.url.searchParams.get('ext') ?? '';
	if (!/^[a-p]{32}$/.test(ext)) error(400, 'Open this from the extension');
	const userId = event.locals.userId;
	if (!userId) {
		redirect(303, `/signin?next=${encodeURIComponent(`/api/extension/link?ext=${ext}`)}`);
	}
	const { token } = await createToken(event.platform, userId, 'Browser extension (signed in)');
	const message = JSON.stringify({ type: 'CONNECT_TOKEN', token, apiBase: event.url.origin });
	return page(
		'Connecting the extension',
		`(function(){var m=document.getElementById('m');try{chrome.runtime.sendMessage(${JSON.stringify(ext)},${message},function(r){m.textContent=r&&r.success?'Connected. You can close this tab.':"Couldn't reach the extension. Reload it and try again."});}catch(e){m.textContent="Couldn't reach the extension. Use Chrome with the createthings extension installed.";}})();`
	);
};
