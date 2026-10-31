import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { triageInput } from '$lib/server/features/focus/input';
import { triageItem } from '$lib/server/features/items/service';

/** POST /api/triage { itemId, decision: keep | let_go | later }: sort one analysed item. */
export const POST: RequestHandler = async (event) => {
	const { itemId, decision } = validate(triageInput, await event.request.json().catch(() => ({})));
	const item = await triageItem(event.platform, currentUserId(event), itemId, decision);
	if (!item) error(409, 'Only analysed items waiting to be sorted (status "ready") can be triaged');
	return json({ item });
};
