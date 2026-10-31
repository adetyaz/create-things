/**
 * Structured (JSON) generation with fallbacks: Workers AI vision → Workers AI text → Gemini → Groq.
 * Locally there is no Workers AI binding, so Gemini answers first.
 * AI Gateway goes in front of these later (Phase 1 #11).
 */
import { extractJson } from './json';
import { MODELS } from './models';
import { gemini, geminiAllowed } from './providers/gemini';
import { groq, groqAvailable } from './providers/groq';
import { workersAiText, workersAiVision } from './providers/workers-ai';
import { MAX_VISION_BYTES, type JsonRequest, type JsonResult } from './types';

export async function generateJson(
	platform: App.Platform | undefined,
	request: JsonRequest
): Promise<JsonResult> {
	const ai = platform?.env?.AI;
	const attempts: Array<[string, () => Promise<unknown>]> = [];

	if (ai && request.image && request.image.bytes.byteLength <= MAX_VISION_BYTES) {
		attempts.push([MODELS.workersAiVision, () => workersAiVision(ai, request)]);
	}
	if (ai) attempts.push([MODELS.workersAiText, () => workersAiText(ai, request)]);
	if (geminiAllowed(platform?.env)) attempts.push([MODELS.gemini, () => gemini(request)]);
	if (groqAvailable()) attempts.push([MODELS.groq, () => groq(request)]);

	const skipped: string[] = [];
	for (const [model, run] of attempts) {
		try {
			return { data: extractJson(await run()), model, skipped };
		} catch (e) {
			skipped.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	throw new Error(
		attempts.length
			? `All models failed. ${skipped.join(' | ')}`
			: 'No AI available: bind Workers AI (AI), or set GEMINI_API_KEY or GROQ_API_KEY'
	);
}
