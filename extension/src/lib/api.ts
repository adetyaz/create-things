/**
 * Talking to createthings: the API address and the device connection token (from the app's
 * settings, until sign-in exists), stored in extension storage.
 */

export const DEFAULT_API = 'http://localhost:5173';

export interface Settings {
	apiBase: string;
	token: string | null;
}

export async function getSettings(): Promise<Settings> {
	const stored = await chrome.storage.local.get(['apiBase', 'token']);
	return {
		apiBase: (stored.apiBase as string) || DEFAULT_API,
		token: (stored.token as string) || null
	};
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
	await chrome.storage.local.set(settings);
}

export class NotConnected extends Error {}

/** A request to the API with the connection token. A 401 means the token was revoked. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const { apiBase, token } = await getSettings();
	if (!token) throw new NotConnected('Not connected yet');
	const res = await fetch(`${apiBase}${path}`, {
		...init,
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
			...(init.headers ?? {})
		}
	});
	const body = await res.json().catch(() => null);
	if (res.status === 401) throw new NotConnected(body?.message ?? 'The connection was revoked');
	if (!res.ok) throw new Error(body?.message ?? `Request failed (${res.status})`);
	return body as T;
}

export type Capture =
	| { captureType: 'url'; sourceUrl: string; title?: string; note?: string; asReference?: boolean }
	| { captureType: 'note'; note: string; title?: string; asReference?: boolean }
	| {
			captureType: 'screenshot';
			image: string;
			mime: 'image/png' | 'image/jpeg';
			sourceUrl?: string;
			title?: string;
			note?: string;
			asReference?: boolean;
	  };

/** Saves a capture; analysis runs on the server. */
export function capture(input: Capture) {
	return api<{ item: { id: string; title: string; status: string } }>('/api/items', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

/** "data:image/png;base64,AAA…" → { mime, base64 }. */
export function splitDataUrl(dataUrl: string): {
	mime: 'image/png' | 'image/jpeg';
	base64: string;
} {
	const [head, base64] = dataUrl.split(',');
	return { mime: head.includes('image/jpeg') ? 'image/jpeg' : 'image/png', base64 };
}

/** Only http(s) pages can be saved as links (not chrome:// or the new-tab page). */
export function isSavableUrl(url: string | undefined): url is string {
	return !!url && /^https?:\/\//i.test(url);
}
