/**
 * AI vision analysis — tries Gemini, then OpenRouter, then Groq text-only.
 */
import { GEMINI_API_KEY } from '$env/static/private';
import { ANALYSIS_SYSTEM, analysisPrompt } from './prompts.js';
import { analyzeFromText } from './groq.js';
import { analyzeImageOpenRouter } from './openrouter.js';

export type { AnalysisResult } from './openrouter.js';
import type { AnalysisResult } from './openrouter.js';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b'];

function geminiUrl(model: string) {
	return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

/**
 * Analyze an image — tries Gemini models, then OpenRouter, then Groq text-only.
 * Accepts either a URL or a base64 data URI.
 */
export async function analyzeImage(opts: {
	imageUrl?: string;
	imageBase64?: string;
	colorPalette: string;
	sourceUrl?: string;
	userNote?: string;
}): Promise<AnalysisResult> {
	const userPrompt = analysisPrompt({
		colorPalette: opts.colorPalette,
		sourceUrl: opts.sourceUrl,
		userNote: opts.userNote
	});

	// Build the parts array for Gemini
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const parts: any[] = [];

	if (opts.imageBase64) {
		const base64 = opts.imageBase64.replace(/^data:image\/\w+;base64,/, '');
		const mimeType = opts.imageBase64.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
		parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
	} else if (opts.imageUrl) {
		const imgResponse = await fetch(opts.imageUrl, { signal: AbortSignal.timeout(15000) });
		const buffer = await imgResponse.arrayBuffer();
		const base64 = Buffer.from(buffer).toString('base64');
		const mimeType = imgResponse.headers.get('content-type') || 'image/png';
		parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
	}

	parts.push({ text: userPrompt });

	// Try each Gemini model in sequence
	let lastError = '';
	for (const model of GEMINI_MODELS) {
		const response = await fetch(geminiUrl(model), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				system_instruction: { parts: [{ text: ANALYSIS_SYSTEM }] },
				contents: [{ parts }],
				generationConfig: {
					temperature: 0.4,
					maxOutputTokens: 2048,
					responseMimeType: 'application/json'
				}
			}),
			signal: AbortSignal.timeout(30000)
		});

		// Skip on quota exhaustion, model unavailable, or overload — try next
		if (response.status === 429 || response.status === 404 || response.status === 503) {
			lastError = `${model} returned ${response.status}`;
			continue;
		}

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Gemini API error ${response.status}: ${text}`);
		}

		const data = await response.json();
		const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!rawText) throw new Error('Gemini returned empty response');

		const result = JSON.parse(rawText) as AnalysisResult;
		if (!Array.isArray(result.mood)) {
			result.mood = typeof result.mood === 'string' ? [result.mood] : [];
		}
		return result;
	}

	// All Gemini models skipped — try OpenRouter
	console.warn(`All Gemini models skipped (${lastError}). Trying OpenRouter.`);
	const openRouterResult = await analyzeImageOpenRouter({
		imageUrl: opts.imageUrl,
		imageBase64: opts.imageBase64,
		colorPalette: opts.colorPalette,
		sourceUrl: opts.sourceUrl,
		userNote: opts.userNote
	});
	if (openRouterResult) return openRouterResult;

	// All vision providers exhausted — Groq text-only fallback
	console.warn('All vision providers exhausted. Using Groq text fallback.');
	return analyzeFromText({
		colorPalette: opts.colorPalette,
		sourceUrl: opts.sourceUrl,
		userNote: opts.userNote
	});
}
