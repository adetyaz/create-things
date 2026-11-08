import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { captureInput, IMAGE_CAPTURE_TYPES } from '$lib/server/features/items/input';
import { captureItem, listItems, retryHeldForCredits } from '$lib/server/features/items/service';

/** POST /api/items: save a capture (Inbox, or Reference) and queue its analysis. */
export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => error(400, 'Send a JSON body'));
	if ((IMAGE_CAPTURE_TYPES as readonly string[]).includes(body?.captureType)) {
		error(501, 'Uploads need R2 storage, which is not set up yet (screenshots work)');
	}
	const input = validate(captureInput, body);
	return json(await captureItem(event.platform, currentUserId(event), input), { status: 201 });
};

/** GET /api/items: the current user's items, newest first. */
export const GET: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	// Saves held back for credits are tried again (free when still out of credits).
	await retryHeldForCredits(event.platform, userId).catch((e) =>
		console.error('[items] retry held saves failed', e)
	);
	return json({ items: await listItems(event.platform, userId) });
};
