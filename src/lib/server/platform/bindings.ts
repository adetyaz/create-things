/** Cloudflare bindings and vars from wrangler.jsonc, as they appear on `platform.env`. */

export interface WorkersAi {
	run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface QueueProducer<Body = unknown> {
	send(body: Body): Promise<void>;
}

/** Everything is optional: local development has no Workers AI, and tests have nothing at all. */
export interface Bindings {
	HYPERDRIVE?: { connectionString: string };
	AI?: WorkersAi;
	ANALYSIS_QUEUE?: QueueProducer;
	MEMORY_QUEUE?: QueueProducer;
	ROADMAP_QUEUE?: QueueProducer;
	/** "true" in the `local` Wrangler environment. */
	LOCAL_DEV?: string;
	/** Set only by scripts/worker-entry.js when it hands a queue message to the app. */
	__FROM_QUEUE?: boolean;
	/** Set only by scripts/worker-entry.js when the daily cron runs. */
	__FROM_CRON?: boolean;
}
