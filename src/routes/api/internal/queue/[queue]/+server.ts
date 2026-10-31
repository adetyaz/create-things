import { error, json, type RequestHandler } from '@sveltejs/kit';
import { handleQueueMessage } from '$lib/server/jobs';

/**
 * POST /api/internal/queue/[queue]
 * Where queue messages land. The worker's queue() handler (scripts/worker-entry.js) calls this
 * in-process, once per message, with a flag outside requests can't set. A non-2xx reply makes the
 * handler retry the message (then dead-letter it after max_retries).
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	if (platform?.env?.__FROM_QUEUE !== true) error(404);

	const outcome = await handleQueueMessage(platform, params.queue!, await request.json());
	if (outcome === null) error(400, `No handler for queue ${params.queue}`);
	return json(outcome);
};
