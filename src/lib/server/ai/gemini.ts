/**
 * Google Gemini API integration — image and URL visual analysis.
 * Uses Gemini 1.5 Flash (free tier).
 */
import { GEMINI_API_KEY } from '$env/static/private';
import { ANALYSIS_SYSTEM, analysisPrompt } from './prompts.js';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface AnalysisResult {
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

/**
 * Analyze an image with Gemini Vision.
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
		// Strip data URI prefix if present
		const base64 = opts.imageBase64.replace(/^data:image\/\w+;base64,/, '');
		const mimeType = opts.imageBase64.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
		parts.push({
			inline_data: { mime_type: mimeType, data: base64 }
		});
	} else if (opts.imageUrl) {
		// Fetch the image and convert to base64
		const imgResponse = await fetch(opts.imageUrl, {
			signal: AbortSignal.timeout(15000)
		});
		const buffer = await imgResponse.arrayBuffer();
		const base64 = Buffer.from(buffer).toString('base64');
		const mimeType = imgResponse.headers.get('content-type') || 'image/png';
		parts.push({
			inline_data: { mime_type: mimeType, data: base64 }
		});
	}

	parts.push({ text: userPrompt });

	const response = await fetch(GEMINI_URL, {
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

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Gemini API error ${response.status}: ${text}`);
	}

	const data = await response.json();
	const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

	if (!rawText) {
		throw new Error('Gemini returned empty response');
	}

	const result = JSON.parse(rawText) as AnalysisResult;

	// Ensure mood is an array
	if (!Array.isArray(result.mood)) {
		result.mood = typeof result.mood === 'string' ? [result.mood] : [];
	}

	return result;
}
