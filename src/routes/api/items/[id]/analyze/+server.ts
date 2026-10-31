import { error, json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { currentUserId } from '$lib/server/user';
import { queueAnalysis } from '$lib/server/analysis/queue';

/** POST /api/items/[id]/analyze: retry the analysis of an item still in the inbox. */
export const POST: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const id = event.params.id!;
	if (!/^[0-9a-f-]{36}$/i.test(id)) error(400, 'Not an item id');

	const [item] = await withDb(event.platform, (db) =>
		db
			.update(items)
			.set({ analysisError: null })
			.where(and(eq(items.id, id), eq(items.userId, userId), eq(items.status, 'inbox')))
			.returning({ id: items.id })
	);
	if (!item)
		error(409, 'Only items still in the inbox can be re-analysed (or the item does not exist)');

	const analysis = await queueAnalysis(event.platform, { itemId: item.id });
	return json({ itemId: item.id, analysis }, { status: 202 });
};
