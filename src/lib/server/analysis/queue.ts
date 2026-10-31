import { dev } from '$app/environment';
import { runAnalysis, type AnalysisJob } from './run';

/**
 * Production sends the job to the analysis queue. `vite dev` has no queue consumer, so it runs the
 * job in the background of the same process instead; the result shows up on GET /api/items/[id].
 */
export async function queueAnalysis(platform: App.Platform | undefined, job: AnalysisJob) {
	if (dev) {
		runAnalysis(platform, job)
			.then((outcome) => console.log('[analysis]', JSON.stringify(outcome)))
			.catch((e) => console.error('[analysis] failed for', job.itemId, e));
		return 'running inline (dev)';
	}
	const queue = platform?.env?.ANALYSIS_QUEUE as { send(body: unknown): Promise<void> } | undefined;
	if (!queue) throw new Error('ANALYSIS_QUEUE binding is missing');
	await queue.send(job);
	return 'queued';
}
