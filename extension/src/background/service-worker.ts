import { checkNotionConnection, setConnected } from './notion-check';

// MV3 service worker — runs in the background

chrome.runtime.onInstalled.addListener(() => {
	console.log('[createthings] Extension installed');
});

// Check Notion connection status on extension icon click
chrome.action.onClicked.addListener(async () => {
	const status = await checkNotionConnection();
	await setConnected(status.connected);
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === 'CAPTURE_VISIBLE_TAB') {
		chrome.tabs
			.captureVisibleTab({ format: 'png', quality: 90 })
			.then((dataUrl) => sendResponse({ success: true, dataUrl }))
			.catch((err) => sendResponse({ success: false, error: String(err) }));
		return true; // keep message channel open for async response
	}

	if (message.type === 'CHECK_NOTION') {
		checkNotionConnection()
			.then((status) => {
				setConnected(status.connected);
				sendResponse(status);
			})
			.catch((err) => sendResponse({ connected: false, error: String(err) }));
		return true;
	}
});
