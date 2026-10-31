/** What runs for each queue's messages. Add a queue in queues.ts, then its handler here. */
import { runAnalysis, type AnalysisJob } from '$lib/server/features/analysis/run';
import type { QueueKey } from './queues';

/** The message body each queue carries. */
export interface JobBodies {
	analysis: AnalysisJob;
}

type Handler<K extends QueueKey> = (
	platform: App.Platform | undefined,
	body: JobBodies[K]
) => Promise<unknown>;

export const HANDLERS: { [K in QueueKey]: Handler<K> } = {
	analysis: runAnalysis
};
