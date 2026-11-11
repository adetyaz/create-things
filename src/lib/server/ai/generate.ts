/**
 * Structured (JSON) generation with fallbacks: Workers AI vision → Workers AI text → Gemini → Groq.
 * Locally there is no Workers AI binding, so Gemini answers first.
 * AI Gateway goes in front of these later (Phase 1 #11).
 */
import { extractJson } from './json';
import { MODELS } from './models';
import { gemini, geminiAllowed, geminiProModel } from './providers/gemini';
import { groq, groqAvailable } from './providers/groq';
import { workersAiText, workersAiVision } from './providers/workers-ai';
import { MAX_VISION_BYTES, type JsonRequest, type JsonResult } from './types';
import { optionalEnv } from '$lib/server/platform/env';

/**
 * Demo recordings only (DEMO_AI_REPLAY=true, local): each AI answer is kept in memory and given
 * again, instantly, when the same request comes back (ids and dates ignored). A first run gets
 * real answers; the recording run reuses them, so the video has no waiting.
 */
const replay = new Map<string, JsonResult>();
function replayKey(r: JsonRequest): string {
	const strip = (t: string) =>
		t
			.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
			.replace(/demo-[a-z0-9-]+/g, '')
			.replace(/\d{4}-\d{2}-\d{2}(T[0-9:.]+Z?)?/g, '');
	return [
		strip(r.system),
		strip(r.prompt),
		r.files?.map((f) => f.bytes.byteLength).join(',') ?? '',
		r.quality ?? ''
	].join('|');
}

/** One more try after a short wait when the provider says it's busy or rate-limited. */
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		if (!/(503|429|500)/.test(message)) throw e;
		await new Promise((r) => setTimeout(r, 1500));
		return run();
	}
}

export async function generateJson(
	platform: App.Platform | undefined,
	request: JsonRequest
): Promise<JsonResult> {
	if (optionalEnv('DEMO_AI_REPLAY') === 'true') {
		const key = replayKey(request);
		const kept = replay.get(key);
		if (kept) return kept;
		const fresh = await generateFresh(platform, request);
		replay.set(key, fresh);
		return fresh;
	}
	return generateFresh(platform, request);
}

async function generateFresh(
	platform: App.Platform | undefined,
	request: JsonRequest
): Promise<JsonResult> {
	const ai = platform?.env?.AI;
	const attempts: Array<[string, () => Promise<unknown>]> = [];

	// Documents (PDFs, several photos) are only read by Gemini; text-only models would guess.
	const readsFilesOnly = Boolean(request.files?.length);
	// Pro answers try the stronger model first; if it fails, the usual chain still answers.
	if (request.quality === 'pro' && geminiAllowed(platform?.env)) {
		const pro = geminiProModel();
		attempts.push([pro, () => gemini(request, pro)]);
	}
	if (
		!readsFilesOnly &&
		ai &&
		request.image &&
		request.image.bytes.byteLength <= MAX_VISION_BYTES
	) {
		attempts.push([MODELS.workersAiVision, () => workersAiVision(ai, request)]);
	}
	if (!readsFilesOnly && ai)
		attempts.push([MODELS.workersAiText, () => workersAiText(ai, request)]);
	if (geminiAllowed(platform?.env)) {
		// Google sometimes answers 503 (busy) or 429: retry once, then try the backup models.
		attempts.push([MODELS.gemini, () => withRetry(() => gemini(request))]);
		for (const backup of MODELS.geminiBackups)
			attempts.push([backup, () => gemini(request, backup)]);
	}
	if (!readsFilesOnly && groqAvailable()) attempts.push([MODELS.groq, () => groq(request)]);

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
			: readsFilesOnly
				? 'Reading documents needs Gemini: set GEMINI_API_KEY (and GEMINI_PAID_TIER=true in production)'
				: 'No AI available: bind Workers AI (AI), or set GEMINI_API_KEY or GROQ_API_KEY'
	);
}
