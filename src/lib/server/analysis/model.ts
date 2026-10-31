/**
 * Structured (JSON) generation with fallbacks: Workers AI vision → Workers AI text → Gemini → Groq.
 * Locally there is no Workers AI binding, so Gemini answers first.
 * Model ids live here so todolist #12 (which models return reliable JSON) can tune them in one place.
 * AI Gateway goes in front of these later (Phase 1 #11).
 */
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { extractJson } from './normalize';

export const MODELS = {
	vision: '@cf/meta/llama-4-scout-17b-16e-instruct',
	text: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	gemini: 'gemini-3.5-flash-lite',
	groq: 'llama-3.3-70b-versatile'
} as const;

/**
 * Gemini's free tier may train on prompts, so it runs locally (`vite dev`, or `LOCAL_DEV` from the
 * `local` Wrangler environment) on your own test data, and in
 * production only when the key is on a paid tier (Breakdown → AI routing, privacy rule).
 */
function geminiAllowed(): boolean {
	return (
		!!env.GEMINI_API_KEY && (dev || env.LOCAL_DEV === 'true' || env.GEMINI_PAID_TIER === 'true')
	);
}

interface WorkersAi {
	run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

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

/** Images above this are sent to the text models only (keeps vision requests fast and cheap). */
const MAX_VISION_BYTES = 4 * 1024 * 1024;

export async function generateJson(
	platform: App.Platform | undefined,
	request: JsonRequest
): Promise<JsonResult> {
	const ai = platform?.env?.AI as WorkersAi | undefined;
	const skipped: string[] = [];
	const attempts: Array<[string, () => Promise<unknown>]> = [];

	if (ai && request.image && request.image.bytes.byteLength <= MAX_VISION_BYTES) {
		const image = request.image;
		attempts.push([
			MODELS.vision,
			() =>
				ai.run(MODELS.vision, {
					messages: [
						{ role: 'system', content: request.system },
						{
							role: 'user',
							content: [
								{ type: 'text', text: request.prompt },
								{ type: 'image_url', image_url: { url: dataUri(image.bytes, image.mime) } }
							]
						}
					],
					max_tokens: 1500
				})
		]);
	}
	if (ai) {
		attempts.push([
			MODELS.text,
			() =>
				ai.run(MODELS.text, {
					messages: [
						{ role: 'system', content: request.system },
						{ role: 'user', content: request.prompt }
					],
					max_tokens: 1500,
					...(request.schema
						? { response_format: { type: 'json_schema', json_schema: request.schema } }
						: {})
				})
		]);
	}
	if (geminiAllowed()) attempts.push([MODELS.gemini, () => gemini(request)]);
	if (env.GROQ_API_KEY) attempts.push([MODELS.groq, () => groq(request)]);

	for (const [model, run] of attempts) {
		try {
			const reply = await run();
			const body = (reply as { response?: unknown })?.response ?? reply;
			return { data: extractJson(body), model, skipped };
		} catch (e) {
			skipped.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	throw new Error(
		attempts.length
			? `All models failed. ${skipped.join(' | ')}`
			: 'No AI available: bind Workers AI (AI) or set GROQ_API_KEY'
	);
}

async function groq(request: JsonRequest): Promise<unknown> {
	const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
		body: JSON.stringify({
			model: MODELS.groq,
			messages: [
				{ role: 'system', content: request.system },
				{ role: 'user', content: request.prompt }
			],
			temperature: 0.3,
			max_tokens: 1500,
			response_format: { type: 'json_object' }
		}),
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
	return body.choices?.[0]?.message?.content;
}

async function gemini(request: JsonRequest): Promise<unknown> {
	const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];
	if (request.image && request.image.bytes.byteLength <= MAX_VISION_BYTES) {
		parts.push({
			inline_data: { mime_type: request.image.mime, data: base64(request.image.bytes) }
		});
	}

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
		body: JSON.stringify({
			systemInstruction: { parts: [{ text: request.system }] },
			contents: [{ role: 'user', parts }],
			generationConfig: {
				responseMimeType: 'application/json',
				temperature: 0.3,
				maxOutputTokens: 1500
			}
		}),
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const body = (await res.json()) as {
		candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
	};
	return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
}

function base64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

function dataUri(bytes: Uint8Array, mime: string): string {
	return `data:${mime};base64,${base64(bytes)}`;
}
