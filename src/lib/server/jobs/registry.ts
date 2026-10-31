/** What runs for each queue's messages. Add a queue in queues.ts, then its handler here. */
import { runAnalysis, type AnalysisJob } from '$lib/server/features/analysis/run';
import { sendMemory, type MemoryJob } from '$lib/server/features/memory/send';
import { runRoadmapJob, type RoadmapJob } from '$lib/server/features/roadmap/job';
import type { QueueKey } from './queues';

/** The message body each queue carries. */
export interface JobBodies {
	analysis: AnalysisJob;
	memory: MemoryJob;
	roadmap: RoadmapJob;
}

type Handler<K extends QueueKey> = (
	platform: App.Platform | undefined,
	body: JobBodies[K]
) => Promise<unknown>;

export const HANDLERS: { [K in QueueKey]: Handler<K> } = {
	analysis: runAnalysis,
	memory: sendMemory,
	roadmap: runRoadmapJob
};
