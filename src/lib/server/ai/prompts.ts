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
	profession?: string;
	professionDetail?: string;
}): string {
	const professionCtx = opts.profession
		? `\n\nUser profile: ${opts.profession}${opts.professionDetail ? ` (${opts.professionDetail})` : ''}. Tailor "forDevelopers" and "forCreators" to what is most useful for this specific role — if the user is a photographer or filmmaker, fill "forCreators" with practical technique advice and return an empty string for "forDevelopers"; if the user is a developer, fill "forDevelopers" with implementation details and return an empty string for "forCreators"; if the user is a designer, fill both.`
		: '';

	const noteCtx = opts.userNote
		? `\n\nThe user was specifically drawn to: "${opts.userNote}". Use this as the primary lens for your breakdown — weight every field toward what they noticed.`
		: '';

	let prompt = `Analyze this captured visual inspiration. Extracted color palette: ${opts.colorPalette}${professionCtx}${noteCtx}

Return a JSON object with exactly these keys:

{
  "technique": "Name the primary visual or photographic technique/pattern — one precise phrase. Examples: 'masonry grid layout', 'panoramic wildlife photography', 'bokeh portrait at golden hour', 'bento grid with micro-animations', 'editorial magazine spread', 'flat lay product photography', 'brutalist hero with oversized type', 'split-column scroll narrative'.",
  "colors": "Describe the color usage — dominant colors, accents, contrast ratios, and how the palette creates hierarchy. Reference hex values.",
  "typography": "Identify fonts if recognizable (or closest match). Note weights, sizes, pairing strategy, and readability.",
  "layout": "Break down the composition — grid system, spacing rhythm, alignment, visual flow, whitespace usage.",
  "mood": ["tag1", "tag2", "tag3"],
  "style": "Overall design or photographic style — e.g. neo-brutalism, editorial zine, cinematic landscape, minimal corporate.",
  "components": "List identifiable UI/design components or photographic elements — cards, navbars, foreground subject, depth layers, background separation, etc.",
  "attribution": "Creator, tool, or platform if identifiable from visible watermarks or UI. Otherwise 'Unknown'.",
  "forDevelopers": "CSS/code architecture hints — likely layout approach (grid/flex/masonry), animation strategy, framework signals, responsive strategy. Empty string if user is a photographer or filmmaker.",
  "forCreators": "What makes this visually work — composition, subject-light relationship, hook style, emotional resonance. Speak to photographers, filmmakers, illustrators, or content creators as relevant. Empty string if user is purely a developer.",
  "roadmapSuggestions": "What skills would someone need to recreate this? List 3-5 specific skills, ordered foundational to advanced."
}

The "mood" field must be an array of 2-5 short tags (e.g. "cinematic", "minimal", "bold").
All other fields must be strings. Return ONLY valid JSON, no markdown fences.`;

	if (opts.sourceUrl) {
		prompt += `\n\nSource URL: ${opts.sourceUrl}`;
	}
	if (opts.userNote) {
		prompt += `\n\nUser's note: "${opts.userNote}"`;
	}

	return prompt;
}

/** System prompt for note analysis via Groq. */
export const NOTE_ANALYSIS_SYSTEM = `You are a creative strategist working for "createthings". When a user captures a text note (an idea, concept, or thought), you extract meaning and direction from it to help them take creative action.`;

/** User prompt for note-type captures — sent to Groq. */
export function noteAnalysisPrompt(
	note: string,
	opts?: { profession?: string; professionDetail?: string }
): string {
	const professionCtx = opts?.profession
		? `\n\nUser profile: ${opts.profession}${opts.professionDetail ? ` (${opts.professionDetail})` : ''}. Tailor "direction" and "brief" to what is most useful for this specific role.`
		: '';

	return `The user captured this thought:

"${note}"${professionCtx}

Analyze it and return a JSON object with exactly these keys:

{
  "concept": "Core concept or theme — 1-2 sentences.",
  "mood": ["tag1", "tag2", "tag3"],
  "direction": "What creative direction does this suggest? Be specific about medium, style, and approach. Speak directly to the user's role if known.",
  "brief": "A short creative brief (3-5 sentences) that someone could use to start working on this idea. Role-specific if profession is known.",
  "visualReferences": "3-5 types of visual references to look for (e.g. 'Swiss poster design from the 1960s', 'Apple product launch pages').",
  "roadmapSuggestions": "3-5 specific skills to bring this idea to life — ordered foundational to advanced."
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
	profession?: string;
	professionDetail?: string;
}): string {
	const professionCtx = opts.profession
		? `\n\nUser profile: ${opts.profession}${opts.professionDetail ? ` (${opts.professionDetail})` : ''}. Tailor "forDevelopers" and "forCreators" to this role.`
		: '';

	const noteCtx = opts.userNote
		? `\n\nThe user was specifically drawn to: "${opts.userNote}". Weight your analysis toward this aspect.`
		: '';

	let prompt = `Analyze this creative inspiration (no image available — text-only).

Color palette: ${opts.colorPalette}${professionCtx}${noteCtx}`;

	if (opts.sourceUrl) prompt += `\n\nSource URL: ${opts.sourceUrl}`;
	if (opts.userNote) prompt += `\n\nUser's note: "${opts.userNote}"`;

	prompt += `

Return a JSON object with exactly these keys:

{
  "technique": "Infer the primary visual or design technique from the URL/context — one precise phrase.",
  "colors": "Describe the color usage from the palette — dominant colors, accents, contrast, hierarchy.",
  "typography": "Likely typography for this type of content — suggest common fonts.",
  "layout": "Likely layout approach based on the URL and context.",
  "mood": ["tag1", "tag2", "tag3"],
  "style": "Infer overall design style from context.",
  "components": "List likely UI components or design elements.",
  "attribution": "Creator or platform if URL reveals it. Otherwise 'Unknown'.",
  "forDevelopers": "Likely technical approach based on context. Empty string if user is a photographer or filmmaker.",
  "forCreators": "What makes this type of content effective. Empty string if user is purely a developer.",
  "roadmapSuggestions": "3-5 specific skills, ordered foundational to advanced."
}

The "mood" field must be an array of 2-5 short tags. All other fields must be strings. Return ONLY valid JSON, no markdown fences.`;

	return prompt;
}

/** System prompt for roadmap generation via Groq. */
export const ROADMAP_SYSTEM = `You are a learning path designer for "createthings". You create personalized, actionable roadmaps based on a specific piece of inspiration. Your milestones are action instructions — not lesson titles. You write them as things to DO, not things to study.`;

/** User prompt for roadmap generation. */
export function roadmapPrompt(opts: {
	inspirationTitle: string;
	analysisStyle: string;
	roadmapSuggestions: string;
	profession?: string;
	professionDetail?: string;
	userNote?: string;
}): string {
	const professionCtx = opts.profession
		? `The person you're building this for is a ${opts.profession}${opts.professionDetail ? ` (specifically: ${opts.professionDetail})` : ''}. Every milestone must speak to their workflow and discipline.`
		: 'Tailor milestones for a creative professional.';

	const noteCtx = opts.userNote
		? `\nWhat specifically caught the user's eye: "${opts.userNote}". Lean the roadmap toward this aspect.`
		: '';

	return `Create a roadmap for someone inspired by this work:

Title: "${opts.inspirationTitle}"
Style / Technique: ${opts.analysisStyle}
Identified skill areas: ${opts.roadmapSuggestions}${noteCtx}

${professionCtx}

CRITICAL — milestones must be action instructions, not lesson titles:
- Photographer/filmmaker: scout a specific location type, name the equipment settings, state the lighting condition, describe the shot composition to attempt
- Developer: build a specific thing (e.g. "Build a masonry grid using CSS Grid with a JS IntersectionObserver scroll-in effect")
- Designer: create a specific artifact (e.g. "Recreate the hero section layout in Figma using 12-column grid at 1440px")
- Writer/illustrator: produce specific pieces at each stage

Return a JSON object with exactly these keys:

{
  "skills": "Comma-separated list of 4-6 specific skills, ordered foundational to advanced.",
  "milestones": "Ordered numbered list of 5-8 action-based milestones. Each reads like an instruction. Format as a numbered list string.",
  "resources": "5-8 specific real resources — tools, tutorials, gear recommendations, accounts or books. Include URLs where possible. Format as a numbered list string."
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
