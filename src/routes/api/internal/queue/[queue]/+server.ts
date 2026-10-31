import { error, json, type RequestHandler } from '@sveltejs/kit';
import { runAnalysis, type AnalysisJob } from '$lib/server/analysis/run';

/** Set only by the queue handler in `scripts/worker-entry.js`; outside requests never carry it. */
const FROM_QUEUE = '__FROM_QUEUE';

/**
 * POST /api/internal/queue/[queue]
 * Where queue messages land. The worker's queue() handler calls this in-process, once per message.
 * A non-2xx reply makes the handler retry the message (then dead-letter it after max_retries).
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	if (platform?.env?.[FROM_QUEUE] !== true) error(404);

	const body = await request.json();
	switch (params.queue) {
		case 'createthings-analysis':
			return json(await runAnalysis(platform, body as AnalysisJob));
		default:
			error(400, `No handler for queue ${params.queue}`);
	}
};
