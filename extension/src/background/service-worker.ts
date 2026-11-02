/**
 * Background worker: takes screenshots for the popup and the area picker, saves captures sent from
 * pages (area screenshots, "Save to createthings" on X posts), and keeps the badge showing reviews due.
 */
import { api, capture, isSavableUrl, NotConnected, splitDataUrl } from '../lib/api';

const BADGE_ALARM = 'refresh-badge';

chrome.runtime.onInstalled.addListener(() => {
	chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 30 });
	void refreshBadge();
});
chrome.runtime.onStartup.addListener(() => void refreshBadge());
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === BADGE_ALARM) void refreshBadge();
});

/** Reviews due today on the badge (the pet's mood joins it once the pet exists). */
async function refreshBadge(): Promise<void> {
	try {
		const { dueTotal } = await api<{ dueTotal: number }>('/api/reviews');
		await chrome.action.setBadgeText({ text: dueTotal > 0 ? String(Math.min(dueTotal, 99)) : '' });
		await chrome.action.setBadgeBackgroundColor({ color: '#6d28d9' });
	} catch (e) {
		await chrome.action.setBadgeText({ text: e instanceof NotConnected ? '!' : '' });
	}
}

function flash(tabId: number | undefined, ok: boolean) {
	if (tabId === undefined) return;
	void chrome.action.setBadgeText({ text: ok ? '✓' : '×', tabId });
	void chrome.action.setBadgeBackgroundColor({ color: ok ? '#15803d' : '#b91c1c', tabId });
	setTimeout(() => void chrome.action.setBadgeText({ text: '', tabId }), 2000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'CAPTURE_VISIBLE_TAB') {
		chrome.tabs
			.captureVisibleTab({ format: 'jpeg', quality: 85 })
			.then((dataUrl) => sendResponse({ success: true, dataUrl }))
			.catch((err) => sendResponse({ success: false, error: String(err) }));
		return true; // async response
	}

	if (message.type === 'SAVE_AREA_SCREENSHOT') {
		const { mime, base64 } = splitDataUrl(message.dataUrl);
		capture({
			captureType: 'screenshot',
			image: base64,
			mime,
			title: sender.tab?.title || 'Area screenshot',
			sourceUrl: isSavableUrl(sender.tab?.url) ? sender.tab.url : undefined
		})
			.then(() => {
				flash(sender.tab?.id, true);
				sendResponse({ success: true });
			})
			.catch((err) => {
				flash(sender.tab?.id, false);
				sendResponse({ success: false, error: String(err?.message ?? err) });
			});
		return true;
	}

	if (message.type === 'SAVE_POST') {
		// "Save to createthings" on an X post: its link, with its text as the note.
		capture({
			captureType: 'url',
			sourceUrl: message.url,
			note: message.text || undefined,
			asReference: message.asReference === true
		})
			.then(() => sendResponse({ success: true }))
			.catch((err) => sendResponse({ success: false, error: String(err?.message ?? err) }));
		return true;
	}

	if (message.type === 'REFRESH_BADGE') {
		void refreshBadge().then(() => sendResponse({ success: true }));
		return true;
	}
});
