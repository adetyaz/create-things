import { dev } from '$app/environment';
import { optionalEnv, requiredEnv } from '$lib/server/platform/env';
import type { Bindings } from '$lib/server/platform/bindings';
import { base64 } from '../json';
import { MODELS } from '../models';
import { MAX_VISION_BYTES, type JsonRequest } from '../types';

/**
 * Gemini's free tier may train on prompts, so it runs locally (`vite dev`, or `LOCAL_DEV` from the
 * `local` Wrangler environment) on your own test data, and in production only when the key is on a
 * paid tier (Breakdown → AI routing, privacy rule).
 */
export function geminiAllowed(bindings: Bindings | undefined): boolean {
	return (
		!!optionalEnv('GEMINI_API_KEY') &&
		(dev || bindings?.LOCAL_DEV === 'true' || optionalEnv('GEMINI_PAID_TIER') === 'true')
	);
}

export async function gemini(request: JsonRequest): Promise<unknown> {
	const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];
	if (request.image && request.image.bytes.byteLength <= MAX_VISION_BYTES) {
		parts.push({
			inline_data: { mime_type: request.image.mime, data: base64(request.image.bytes) }
		});
	}

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-goog-api-key': requiredEnv('GEMINI_API_KEY')
		},
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
