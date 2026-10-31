import { error, json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items } from '$lib/server/db/schema';
import { currentUserId } from '$lib/server/user';

/** GET /api/items/[id]: one item with its latest analysis (null until the job finishes). */
export const GET: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const id = event.params.id!;
	if (!/^[0-9a-f-]{36}$/i.test(id)) error(400, 'Not an item id');

	const result = await withDb(event.platform, async (db) => {
		const [item] = await db
			.select()
			.from(items)
			.where(and(eq(items.id, id), eq(items.userId, userId)));
		if (!item) return null;
		const [analysis] = await db
			.select()
			.from(analyses)
			.where(eq(analyses.itemId, id))
			.orderBy(desc(analyses.createdAt))
			.limit(1);
		return { item, analysis: analysis ?? null };
	});

	if (!result) error(404, 'Item not found');
	return json(result);
};
