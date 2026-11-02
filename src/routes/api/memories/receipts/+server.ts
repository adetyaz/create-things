import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { memoryReceipt } from '$lib/server/features/memory/receipts';

/** GET /api/memories/receipts: the Walrus Memory account on Sui, read through Tatum, plus yours. */
export const GET: RequestHandler = async (event) => {
	return json(await memoryReceipt(event.platform, currentUserId(event)));
};
