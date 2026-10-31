import type { WorkersAi } from '$lib/server/platform/bindings';
import { base64 } from '../json';
import { MODELS } from '../models';
import { DEFAULT_MAX_TOKENS, type JsonRequest } from '../types';

/** Workers AI replies as `{ response }`; the response may already be parsed JSON. */
function unwrap(reply: unknown): unknown {
	return (reply as { response?: unknown })?.response ?? reply;
}

export async function workersAiVision(ai: WorkersAi, request: JsonRequest): Promise<unknown> {
	const image = request.image!;
	return unwrap(
		await ai.run(MODELS.workersAiVision, {
			messages: [
				{ role: 'system', content: request.system },
				{
					role: 'user',
					content: [
						{ type: 'text', text: request.prompt },
						{
							type: 'image_url',
							image_url: { url: `data:${image.mime};base64,${base64(image.bytes)}` }
						}
					]
				}
			],
			max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS
		})
	);
}

export async function workersAiText(ai: WorkersAi, request: JsonRequest): Promise<unknown> {
	return unwrap(
		await ai.run(MODELS.workersAiText, {
			messages: [
				{ role: 'system', content: request.system },
				{ role: 'user', content: request.prompt }
			],
			max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
			...(request.schema
				? { response_format: { type: 'json_schema', json_schema: request.schema } }
				: {})
		})
	);
}
