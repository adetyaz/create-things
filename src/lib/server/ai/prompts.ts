/**
 * All AI prompt templates for createthings.
 *
 * Used by both Gemini (vision analysis) and Groq (text generation).
 */

/** System prompt for visual analysis via Gemini Vision. */
export const ANALYSIS_SYSTEM = `You are a senior design analyst working for a creative workflow platform called "createthings". Your job is to analyze captured visual inspiration — screenshots, images, and web pages — and return structured design intelligence.

Be specific and actionable. Name real fonts, real patterns, real technologies. Reference concrete details visible in the image.`;

/** User prompt for image/URL analysis — sent with the image to Gemini. */
export function analysisPrompt(opts: {
	colorPalette: string;
	sourceUrl?: string;
	userNote?: string;
}): string {
	let prompt = `Analyze this captured visual inspiration. Here is the extracted color palette: ${opts.colorPalette}

Return a JSON object with exactly these keys:

{
  "colors": "Describe the color usage — dominant colors, accents, contrast ratios, and how the palette creates hierarchy. Reference the hex values.",
  "typography": "Identify fonts if recognizable (or closest match). Note weights, sizes, pairing strategy, and readability.",
  "layout": "Break down the composition — grid system, spacing rhythm, alignment, visual flow, whitespace usage.",
  "mood": ["tag1", "tag2", "tag3"],
  "style": "Describe the overall design style — e.g. neo-brutalism, minimal corporate, editorial magazine, etc.",
  "components": "List identifiable UI or design components — cards, navbars, hero sections, CTAs, modals, etc.",
  "attribution": "If you can identify the creator, tool, or platform from visible watermarks/UI, note it here. Otherwise say 'Unknown'.",
  "forDevelopers": "Architecture hints — likely CSS approach (grid/flex), framework signals, animation techniques, responsive strategy.",
  "forCreators": "Content strategy — what makes this visually effective? Hook style, narrative structure, why it captures attention.",
  "roadmapSuggestions": "What skills would someone need to recreate this? List 3-5 specific skills."
}

The "mood" field must be an array of 2-5 short tags (e.g. "minimal", "bold", "playful").
All other fields must be strings. Return ONLY valid JSON, no markdown fences.`;

	if (opts.sourceUrl) {
		prompt += `\n\nSource URL: ${opts.sourceUrl}`;
	}
	if (opts.userNote) {
		prompt += `\n\nUser's note about this piece: "${opts.userNote}"`;
	}

	return prompt;
}

/** System prompt for note analysis via Groq. */
export const NOTE_ANALYSIS_SYSTEM = `You are a creative strategist working for "createthings". When a user captures a text note (an idea, concept, or thought), you extract meaning and direction from it to help them take creative action.`;

/** User prompt for note-type captures — sent to Groq. */
export function noteAnalysisPrompt(note: string): string {
	return `The user captured this thought:

"${note}"

Analyze it and return a JSON object with exactly these keys:

{
  "concept": "What is the core concept or theme? Summarize in 1-2 sentences.",
  "mood": ["tag1", "tag2", "tag3"],
  "direction": "What creative direction does this suggest? Be specific about medium, style, and approach.",
  "brief": "Write a short creative brief (3-5 sentences) that someone could use to start working on this idea.",
  "visualReferences": "Suggest 3-5 types of visual references they should look for to develop this idea (e.g. 'Swiss poster design from the 1960s', 'Apple product launch pages').",
  "roadmapSuggestions": "What skills would someone need to bring this idea to life? List 3-5 specific skills."
}

The "mood" field must be an array of 2-5 short tags.
All other fields must be strings. Return ONLY valid JSON, no markdown fences.`;
}

/** System prompt for text-only visual analysis fallback via Groq (used when Gemini quota is exhausted). */
export const TEXT_ANALYSIS_SYSTEM = `You are a senior design analyst working for "createthings". When no image is available, analyze the provided color palette, source URL, and any user notes to infer design characteristics and return structured design intelligence. Be specific and actionable.`;

/** User prompt for text-only analysis — sent to Groq when Gemini is unavailable. */
export function textAnalysisPrompt(opts: {
	colorPalette: string;
	sourceUrl?: string;
	userNote?: string;
}): string {
	let prompt = `Analyze this creative inspiration based on available context (no image, text-only analysis).

Color palette:
${opts.colorPalette}`;

	if (opts.sourceUrl) prompt += `\n\nSource URL: ${opts.sourceUrl}`;
	if (opts.userNote) prompt += `\n\nUser's note: "${opts.userNote}"`;

	prompt += `

Return a JSON object with exactly these keys:

{
  "colors": "Describe the color usage — dominant colors, accents, contrast, and how the palette creates hierarchy.",
  "typography": "Based on context, suggest likely typography — common fonts for this type of design.",
  "layout": "Based on the URL/context, describe the likely layout approach.",
  "mood": ["tag1", "tag2", "tag3"],
  "style": "Infer the overall design style from the available context.",
  "components": "List likely UI or design components based on the source type.",
  "attribution": "If the source URL reveals the creator or platform, note it. Otherwise 'Unknown'.",
  "forDevelopers": "Suggest likely technical approaches based on the source context.",
  "forCreators": "What makes this type of content effective?",
  "roadmapSuggestions": "What skills would someone need to create something like this? List 3-5 specific skills."
}

The "mood" field must be an array of 2-5 short tags. All other fields must be strings. Return ONLY valid JSON, no markdown fences.`;

	return prompt;
}

/** System prompt for roadmap generation via Groq. */
export const ROADMAP_SYSTEM = `You are a learning path designer for "createthings". You create personalized, actionable learning roadmaps based on a specific piece of inspiration and its analysis. Focus on practical skill-building, not theory dumps.`;

/** User prompt for roadmap generation. */
export function roadmapPrompt(opts: {
	inspirationTitle: string;
	analysisStyle: string;
	roadmapSuggestions: string;
}): string {
	return `Create a learning roadmap for someone who wants to develop the skills shown in this inspiration:

Title: "${opts.inspirationTitle}"
Style: ${opts.analysisStyle}
Suggested skills: ${opts.roadmapSuggestions}

Return a JSON object with exactly these keys:

{
  "skills": "Comma-separated list of 4-6 specific skills to develop, ordered from foundational to advanced.",
  "milestones": "Ordered list of 5-8 concrete learning milestones. Each should be a specific, completable task (not vague). Format as a numbered list string.",
  "resources": "5-8 specific, real resources — tutorials, courses, tools, or references. Include URLs where possible. Format as a numbered list string."
}

All fields must be strings. Return ONLY valid JSON, no markdown fences.`;
}

/** System prompt for caption generation via Groq. */
export const CAPTION_SYSTEM = `You are a social media strategist for "createthings". You write platform-specific captions for creative work being published. Each caption must feel native to its platform — not a copy-paste across platforms.`;

/** User prompt for caption drafting. */
export function captionPrompt(opts: {
	projectTitle: string;
	remixTag: string;
	creditLine: string;
	description: string;
}): string {
	return `Draft social media captions for publishing this creative work:

Project: "${opts.projectTitle}"
Remix type: ${opts.remixTag}
Credit: ${opts.creditLine}
Description: ${opts.description}

Return a JSON object with exactly these keys:

{
  "twitter": "Max 280 characters. Punchy, concise. Include the credit naturally.",
  "linkedin": "Professional framing. 1-2 short paragraphs. Credit included.",
  "instagram": "Visual-first tone. Emoji-friendly. Credit in caption body.",
  "reddit": "Community-aware, no hard sell. Honest about the remix type. Credit included.",
  "creditLine": "A standalone attribution line, e.g. 'Inspired by @creator — original at [url]'",
  "hashtags": "5-8 relevant hashtags, space-separated, starting with #"
}

All fields must be strings. Return ONLY valid JSON, no markdown fences.`;
}
