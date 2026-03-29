const API_BASE = 'https://create-things.vercel.app';

export interface NotionStatus {
	connected: boolean;
	databases: Record<string, string> | null;
}

/** Check if Notion is connected by hitting the SvelteKit status endpoint. */
export async function checkNotionConnection(): Promise<NotionStatus> {
	try {
		const apiBase = await getApiBase();
		const response = await fetch(`${apiBase}/api/notion/status`, {
			credentials: 'include'
		});
		if (!response.ok) return { connected: false, databases: null };
		return response.json();
	} catch {
		return { connected: false, databases: null };
	}
}

/** Get the stored API base URL (defaults to localhost for dev). */
export async function getApiBase(): Promise<string> {
	const result = await chrome.storage.local.get('apiBase');
	return (result.apiBase as string) || API_BASE;
}

/** Store the Notion token reference in extension storage. */
export async function setConnected(connected: boolean): Promise<void> {
	await chrome.storage.local.set({ notionConnected: connected });
}

/** Quick sync check from extension storage (no network call). */
export async function isConnectedLocally(): Promise<boolean> {
	const result = await chrome.storage.local.get('notionConnected');
	return result.notionConnected === true;
}
