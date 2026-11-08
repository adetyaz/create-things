import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { entryInput } from '$lib/server/features/journal/input';
import { addEntry, listEntries } from '$lib/server/features/journal/service';

/**
 * POST /api/journal { kind: entry | check_in, body, itemId?, stepId?, aboutDay? }: write an entry.
 * → { entry, about, fed, suggestFocus, offerCards }. Entries about Focus work feed the pet.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(entryInput, await event.request.json().catch(() => ({})));
	return json(await addEntry(event.platform, currentUserId(event), input), { status: 201 });
};

/** GET /api/journal?itemId=&limit=: entries, newest first. */
export const GET: RequestHandler = async (event) => {
	const itemId = event.url.searchParams.get('itemId') ?? undefined;
	const limit = Number(event.url.searchParams.get('limit')) || undefined;
	return json({
		entries: await listEntries(event.platform, currentUserId(event), { itemId, limit })
	});
};
