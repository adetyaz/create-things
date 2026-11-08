export interface JsonRequest {
	system: string;
	prompt: string;
	/** JSON schema for models with structured output. */
	schema?: Record<string, unknown>;
	image?: { bytes: Uint8Array; mime: string };
	/** Documents to read (PDFs, photos, text). Only models that read files are tried. */
	files?: { bytes: Uint8Array; mime: string }[];
	/** Longest reply allowed, in tokens. Long structured replies (roadmaps) need more. */
	maxTokens?: number;
	/** 'pro': a stronger model first (paid per answer or with credits ×10), then the usual chain. */
	quality?: 'basic' | 'pro';
}

/** Enough for an analysis; roadmaps ask for more. */
export const DEFAULT_MAX_TOKENS = 1500;

export interface JsonResult {
	data: Record<string, unknown>;
	model: string;
	/** Models that were tried and failed first, with why. */
	skipped: string[];
}

/** Images above this go to text-only models (keeps vision requests fast and cheap). */
export const MAX_VISION_BYTES = 4 * 1024 * 1024;
