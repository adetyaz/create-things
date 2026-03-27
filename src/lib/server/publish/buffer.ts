/**
 * Buffer API adapter — sends posts to social platforms via Buffer.
 *
 * Buffer is the easiest social publishing API (free tier available).
 * It acts as a proxy to Twitter/X, LinkedIn, Instagram, Reddit etc.
 *
 * API docs: https://buffer.com/developers/api
 */
import { BUFFER_ACCESS_TOKEN } from '$env/static/private';

const BUFFER_API = 'https://api.buffer.com/1';

interface BufferProfile {
	id: string;
	service: string;
}

/** Cache of profile IDs per service (populated on first call). */
let profileCache: BufferProfile[] | null = null;

/** Fetch the user's Buffer profiles (one per connected social account). */
async function getProfiles(): Promise<BufferProfile[]> {
	if (profileCache) return profileCache;

	const response = await fetch(`${BUFFER_API}/profiles.json`, {
		headers: { Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}` }
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Buffer profiles error ${response.status}: ${text}`);
	}

	const profiles = await response.json();
	profileCache = profiles.map((p: { id: string; service: string }) => ({
		id: p.id,
		service: p.service
	}));
	return profileCache!;
}

/** Map our platform names to Buffer service names. */
function toBufferService(platform: string): string {
	const map: Record<string, string> = {
		twitter: 'twitter',
		linkedin: 'linkedin',
		instagram: 'instagram',
		reddit: 'reddit'
	};
	return map[platform] || platform;
}

/** Publish a post to a specific platform via Buffer. */
export async function publishToBuffer(opts: {
	platform: string;
	text: string;
}): Promise<{ success: boolean; id?: string }> {
	if (!BUFFER_ACCESS_TOKEN || BUFFER_ACCESS_TOKEN === 'placeholder') {
		// In development, log and return mock success
		console.log(`[Buffer mock] Would publish to ${opts.platform}: ${opts.text.slice(0, 100)}...`);
		return { success: true, id: 'mock-' + Date.now() };
	}

	const profiles = await getProfiles();
	const service = toBufferService(opts.platform);
	const profile = profiles.find((p) => p.service === service);

	if (!profile) {
		throw new Error(`No Buffer profile connected for "${opts.platform}"`);
	}

	const response = await fetch(`${BUFFER_API}/updates/create.json`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`
		},
		body: new URLSearchParams({
			profile_ids: profile.id,
			text: opts.text,
			now: 'true'
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Buffer create error ${response.status}: ${text}`);
	}

	const result = await response.json();
	return { success: result.success, id: result.updates?.[0]?.id };
}
