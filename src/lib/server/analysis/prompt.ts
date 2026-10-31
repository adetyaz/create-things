/** Prompt for the v2 analysis: what the capture is, and how big a thing it would be to start. */

export const ANALYSIS_SYSTEM = `You analyze things a person saved because they want to make, recreate or learn something. They are easily overwhelmed, so be concrete: name real fonts, techniques, tools and skills. Reply with one JSON object only, no prose.`;

export interface AnalysisInput {
	captureType: 'url' | 'note' | 'screenshot' | 'upload' | 'voice';
	title?: string | null;
	sourceUrl?: string | null;
	note?: string | null;
	/** From page metadata, for links. */
	description?: string | null;
	author?: string | null;
	/** Formatted palette, when one was extracted. */
	palette?: string | null;
	hasImage: boolean;
}

export function analysisPrompt(input: AnalysisInput): string {
	const lines = [
		input.hasImage
			? 'Analyze the attached image and the details below.'
			: 'There is no image. Analyze from the details below and infer what you reasonably can.',
		'',
		`Capture type: ${input.captureType}`
	];
	if (input.title) lines.push(`Title: ${input.title}`);
	if (input.sourceUrl) lines.push(`Source URL: ${input.sourceUrl}`);
	if (input.author) lines.push(`Author: ${input.author}`);
	if (input.description) lines.push(`Page description: ${input.description}`);
	if (input.palette) lines.push(`Extracted colors: ${input.palette}`);
	if (input.note) lines.push(`The person's note (weight your answer toward this): "${input.note}"`);

	lines.push(
		'',
		'Return JSON with exactly these keys:',
		'{',
		'  "title": "short name for this item, max 8 words",',
		'  "summary": "one sentence: what this is",',
		'  "technique": "the main technique or pattern, one phrase",',
		'  "colors": "how color is used (refer to the extracted colors if given)",',
		'  "typography": "fonts (or closest match), weights, pairing",',
		'  "layout": "composition, grid, spacing, flow",',
		'  "mood": ["2-5 short tags"],',
		'  "style": "overall style",',
		'  "components": "identifiable UI or visual elements",',
		'  "forDevelopers": "implementation hints, or empty string if not relevant",',
		'  "forCreators": "why it works visually or as content, or empty string if not relevant",',
		'  "brief": "2-3 sentences: a starting brief for making their own version",',
		'  "skills": ["3-6 skills needed, foundational first"],',
		'  "size": "afternoon | weekend | week | month — how long a first version takes for someone with some experience",',
		'  "difficulty": "easy | medium | hard",',
		'  "isLearningGoal": true if this is mainly about learning a skill ("learn Blender") rather than making or recreating a specific thing',
		'}',
		'For a plain idea note with no visual, use empty strings for colors, typography and layout.'
	);
	return lines.join('\n');
}

/** JSON schema for models that support structured output (Workers AI JSON mode). */
export const ANALYSIS_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		summary: { type: 'string' },
		technique: { type: 'string' },
		colors: { type: 'string' },
		typography: { type: 'string' },
		layout: { type: 'string' },
		mood: { type: 'array', items: { type: 'string' } },
		style: { type: 'string' },
		components: { type: 'string' },
		forDevelopers: { type: 'string' },
		forCreators: { type: 'string' },
		brief: { type: 'string' },
		skills: { type: 'array', items: { type: 'string' } },
		size: { type: 'string', enum: ['afternoon', 'weekend', 'week', 'month'] },
		difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
		isLearningGoal: { type: 'boolean' }
	},
	required: ['title', 'summary', 'size', 'difficulty', 'isLearningGoal']
} as const;
