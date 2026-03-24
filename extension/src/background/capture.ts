export type CaptureType = 'screenshot' | 'url' | 'upload' | 'note';

export interface CapturePayload {
	type: CaptureType;
	title?: string;
	sourceUrl?: string;
	imageBase64?: string;
	note?: string;
}

const API_BASE = 'http://localhost:5173';

/** Send a capture payload to the SvelteKit server, which writes to Notion. */
export async function sendCapture(
	payload: CapturePayload
): Promise<{ success: boolean; pageId?: string; error?: string }> {
	try {
		const response = await fetch(`${API_BASE}/api/capture`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const text = await response.text();
			return { success: false, error: text };
		}

		return response.json();
	} catch (err) {
		return { success: false, error: String(err) };
	}
}

/** Capture the currently visible tab as a screenshot (full page). */
export async function captureVisibleTab(): Promise<string> {
	const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png', quality: 90 });
	return dataUrl;
}

/** Get the current tab's URL and title. */
export async function getCurrentTab(): Promise<{ url: string; title: string }> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return {
		url: tab?.url || '',
		title: tab?.title || ''
	};
}
