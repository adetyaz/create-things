import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { planMonthInput, unparkInput } from '$lib/server/features/plan/input';
import { getMonth, planMonth, unpark } from '$lib/server/features/plan/month';

/** GET /api/plan/month: this month's goals, the not-this-month list, and whether it's planned. */
export const GET: RequestHandler = async (event) => {
	return json(await getMonth(event.platform, currentUserId(event)));
};

/** POST /api/plan/month { goalItemIds: 1–3 ids, review? }: pick the month's goals, park the rest. */
export const POST: RequestHandler = async (event) => {
	const input = validate(planMonthInput, await event.request.json().catch(() => ({})));
	const result = await planMonth(event.platform, currentUserId(event), input);
	if (result.status === 'invalid')
		error(400, 'Goals must be your Shortlist, Ready, Paused or Focus items');
	return json(result);
};

/** PATCH /api/plan/month { itemId }: bring an item back from the not-this-month list. */
export const PATCH: RequestHandler = async (event) => {
	const { itemId } = validate(unparkInput, await event.request.json().catch(() => ({})));
	const item = await unpark(event.platform, currentUserId(event), itemId);
	if (!item) error(404, 'No item with that id');
	return json({ item });
};
