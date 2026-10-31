/** Finds the JSON object in a model reply that may be wrapped in prose or ``` fences. */
export function extractJson(reply: unknown): Record<string, unknown> {
	if (reply && typeof reply === 'object') return reply as Record<string, unknown>;
	if (typeof reply !== 'string') throw new Error('Model reply was empty');

	const start = reply.indexOf('{');
	const end = reply.lastIndexOf('}');
	if (start < 0 || end <= start) throw new Error('Model reply had no JSON object');
	return JSON.parse(reply.slice(start, end + 1));
}

/** Base64 without Node's Buffer (works on Workers). */
export function base64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}
