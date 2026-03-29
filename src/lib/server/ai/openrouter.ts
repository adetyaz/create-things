/**
 * OpenRouter API integration — vision analysis via free multimodal models.
 * Uses the OpenAI-compatible chat completions endpoint.
 * Free tier models with vision: llama-4-maverick, llama-4-scout, qwen2.5-vl-72b
 */
import { OPENROUTER_API_KEY } from '$env/static/private';
import { ANALYSIS_SYSTEM, analysisPrompt } from './prompts.js';

export interface AnalysisResult {
	technique: string;
	colors: string;
	typography: string;
	layout: string;
	mood: string[];
	style: string;
	components: string;
	attribution: string;
	forDevelopers: string;
	forCreators: string;
	roadmapSuggestions: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Free vision-capable models, tried in order. */
const OPENROUTER_MODELS = [
	'meta-llama/llama-4-maverick:free',
	'meta-llama/llama-4-scout:free',
	'qwen/qwen2.5-vl-72b-instruct:free'
];

async function tryModel(model: string, messages: object[]): Promise<AnalysisResult | null> {
	const response = await fetch(OPENROUTER_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'HTTP-Referer': 'https://create-things.vercel.app',
			'X-Title': 'createthings'
		},
		body: JSON.stringify({
			model,
			messages,
			temperature: 0.4,
			max_tokens: 2048,
			response_format: { type: 'json_object' }
		}),
		signal: AbortSignal.timeout(45000)
	});

	if (!response.ok) {
		// Any error (quota, auth, unavailable) — skip this model rather than aborting the chain
		console.warn(`OpenRouter ${model} returned ${response.status} — skipping`);
		return null;
	}

	const data = await response.json();
	const rawText = data.choices?.[0]?.message?.content;
	if (!rawText) return null;

	const result = JSON.parse(rawText) as AnalysisResult;
	if (!Array.isArray(result.mood)) {
		result.mood = typeof result.mood === 'string' ? [result.mood] : [];
	}
	return result;
}

/** Analyze an image via OpenRouter vision models. */
export async function analyzeImageOpenRouter(opts: {
	imageUrl?: string;
	imageBase64?: string;
	colorPalette: string;
	sourceUrl?: string;
	userNote?: string;
	profession?: string;
	professionDetail?: string;
}): Promise<AnalysisResult | null> {
	const userPrompt = analysisPrompt({
		colorPalette: opts.colorPalette,
		sourceUrl: opts.sourceUrl,
		userNote: opts.userNote,
		profession: opts.profession,
		professionDetail: opts.professionDetail
	});

	// Build image content part
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const contentParts: any[] = [];

	if (opts.imageBase64) {
		const dataUri = opts.imageBase64.startsWith('data:')
			? opts.imageBase64
			: `data:image/png;base64,${opts.imageBase64}`;
		contentParts.push({ type: 'image_url', image_url: { url: dataUri } });
	} else if (opts.imageUrl) {
		// Fetch and convert to base64 so we don't leak URLs to OpenRouter
		try {
			const imgResponse = await fetch(opts.imageUrl, { signal: AbortSignal.timeout(15000) });
			const buffer = await imgResponse.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');
			const mimeType = imgResponse.headers.get('content-type') || 'image/png';
			contentParts.push({
				type: 'image_url',
				image_url: { url: `data:${mimeType};base64,${base64}` }
			});
		} catch {
			// Image fetch failed — proceed text-only with color palette
		}
	}

	contentParts.push({ type: 'text', text: userPrompt });

	const messages = [
		{ role: 'system', content: ANALYSIS_SYSTEM },
		{ role: 'user', content: contentParts }
	];

	for (const model of OPENROUTER_MODELS) {
		const result = await tryModel(model, messages);
		if (result) return result;
	}

	return null; // all models exhausted — caller falls back to Groq text
}
