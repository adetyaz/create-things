export interface JsonRequest {
	system: string;
	prompt: string;
	/** JSON schema for models with structured output. */
	schema?: Record<string, unknown>;
	image?: { bytes: Uint8Array; mime: string };
}

export interface JsonResult {
	data: Record<string, unknown>;
	model: string;
	/** Models that were tried and failed first, with why. */
	skipped: string[];
}

/** Images above this go to text-only models (keeps vision requests fast and cheap). */
export const MAX_VISION_BYTES = 4 * 1024 * 1024;
