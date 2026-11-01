/** Model ids in one place, so todolist #12 (which models return reliable JSON) can tune them. */
export const MODELS = {
	workersAiVision: '@cf/meta/llama-4-scout-17b-16e-instruct',
	workersAiText: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	gemini: 'gemini-3.5-flash-lite',
	groq: 'llama-3.3-70b-versatile',
	whisper: '@cf/openai/whisper-large-v3-turbo'
} as const;
