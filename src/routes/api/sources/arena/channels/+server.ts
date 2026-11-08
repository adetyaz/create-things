import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { channelInput } from '$lib/server/features/sources/input';
import { connectChannel, listChannels } from '$lib/server/features/arena/service';

/** GET /api/sources/arena/channels: your channels, and which are brought in. */
export const GET: RequestHandler = async (event) => {
	return json(await listChannels(event.platform, currentUserId(event)));
};

/**
 * POST /api/sources/arena/channels { id, title, mode: triage | shortlist | reference }: bring a
 * channel in (first sync now; blocks not analysed until used) → { collectionId, added, summary }.
 */
export const POST: RequestHandler = async (event) => {
	const { id, title, mode } = validate(channelInput, await event.request.json().catch(() => ({})));
	return json(await connectChannel(event.platform, currentUserId(event), { id, title }, mode));
};
