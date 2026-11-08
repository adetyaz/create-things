import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { doneInput } from '$lib/server/features/imports/input';
import { analysisCost, finishImport } from '$lib/server/features/imports/service';

/** POST /api/imports/done { collectionId, count }: one memory for the import, and what analysis would cost. */
export const POST: RequestHandler = async (event) => {
	const { collectionId, count } = validate(doneInput, await event.request.json().catch(() => ({})));
	const userId = currentUserId(event);
	const summary = await finishImport(event.platform, userId, collectionId, count);
	return json({ summary, analysis: await analysisCost(event.platform, userId, collectionId) });
};
