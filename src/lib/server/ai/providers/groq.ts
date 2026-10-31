import { optionalEnv, requiredEnv } from '$lib/server/platform/env';
import { MODELS } from '../models';
import type { JsonRequest } from '../types';

export function groqAvailable(): boolean {
	return !!optionalEnv('GROQ_API_KEY');
}

export async function groq(request: JsonRequest): Promise<unknown> {
	const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${requiredEnv('GROQ_API_KEY')}`
		},
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
