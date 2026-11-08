import { json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam, validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { analyseInput } from '$lib/server/features/imports/input';
import { analyseNext, analysisCost } from '$lib/server/features/imports/service';

/** GET /api/collections/[id]/analyse: how many wait for analysis and what it costs (shown first). */
export const GET: RequestHandler = async (event) => {
	return json(await analysisCost(event.platform, currentUserId(event), uuidParam(event.params.id)));
};

/** POST /api/collections/[id]/analyse { count }: "Analyse next" (1) or "Analyse 20". */
export const POST: RequestHandler = async (event) => {
	const { count } = validate(analyseInput, await event.request.json().catch(() => ({})));
	return json(
		await analyseNext(event.platform, currentUserId(event), uuidParam(event.params.id), count)
	);
};
