/**
 * Groq API integration — text generation for notes, roadmaps, and captions.
 * Uses llama3-70b-8192 (free tier).
 */
import { GROQ_API_KEY } from '$env/static/private';
import {
	NOTE_ANALYSIS_SYSTEM,
	noteAnalysisPrompt,
	ROADMAP_SYSTEM,
	roadmapPrompt,
	CAPTION_SYSTEM,
	captionPrompt,
	TEXT_ANALYSIS_SYSTEM,
	textAnalysisPrompt
} from './prompts.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface GroqMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** Call Groq chat completions and parse JSON response. */
async function groqChat<T>(messages: GroqMessage[]): Promise<T> {
	const response = await fetch(GROQ_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${GROQ_API_KEY}`
		},
		body: JSON.stringify({
			model: GROQ_MODEL,
			messages,
			temperature: 0.4,
			max_tokens: 2048,
			response_format: { type: 'json_object' }
		}),
		signal: AbortSignal.timeout(30000)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Groq API error ${response.status}: ${text}`);
	}

	const data = await response.json();
	const rawText = data.choices?.[0]?.message?.content;

	if (!rawText) {
		throw new Error('Groq returned empty response');
	}

	return JSON.parse(rawText) as T;
}

// --- Text-only visual analysis fallback (used when Gemini quota is exhausted) ---

export interface VisualAnalysisResult {
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

/** Analyze using only color palette + URL — fallback when all Gemini models are quota-limited. */
export async function analyzeFromText(opts: {
	colorPalette: string;
	sourceUrl?: string;
	userNote?: string;
}): Promise<VisualAnalysisResult> {
	const result = await groqChat<VisualAnalysisResult>([
		{ role: 'system', content: TEXT_ANALYSIS_SYSTEM },
		{ role: 'user', content: textAnalysisPrompt(opts) }
	]);
	if (!Array.isArray(result.mood)) {
		result.mood = typeof result.mood === 'string' ? [result.mood] : [];
	}
	return result;
}

// --- Note analysis ---

export interface NoteAnalysisResult {
	concept: string;
	mood: string[];
	direction: string;
	brief: string;
	visualReferences: string;
	roadmapSuggestions: string;
}

/** Analyze a text note capture. */
export async function analyzeNote(note: string): Promise<NoteAnalysisResult> {
	const result = await groqChat<NoteAnalysisResult>([
		{ role: 'system', content: NOTE_ANALYSIS_SYSTEM },
		{ role: 'user', content: noteAnalysisPrompt(note) }
	]);

	if (!Array.isArray(result.mood)) {
		result.mood = typeof result.mood === 'string' ? [result.mood] : [];
	}

	return result;
}

// --- Roadmap generation ---

export interface RoadmapResult {
	skills: string;
	milestones: string;
	resources: string;
}

/** Generate a learning roadmap from an inspiration's analysis. */
export async function generateRoadmap(opts: {
	inspirationTitle: string;
	analysisStyle: string;
	roadmapSuggestions: string;
}): Promise<RoadmapResult> {
	return groqChat<RoadmapResult>([
		{ role: 'system', content: ROADMAP_SYSTEM },
		{ role: 'user', content: roadmapPrompt(opts) }
	]);
}

// --- Caption generation ---

export interface CaptionResult {
	twitter: string;
	linkedin: string;
	instagram: string;
	reddit: string;
	creditLine: string;
	hashtags: string;
}

/** Draft platform-specific captions for a creative work. */
export async function generateCaptions(opts: {
	projectTitle: string;
	remixTag: string;
	creditLine: string;
	description: string;
}): Promise<CaptionResult> {
	return groqChat<CaptionResult>([
		{ role: 'system', content: CAPTION_SYSTEM },
		{ role: 'user', content: captionPrompt(opts) }
	]);
}
