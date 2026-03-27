import { checkNotionConnection, setConnected, getApiBase } from './notion-check';

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'CAPTURE_VISIBLE_TAB') {
		chrome.tabs
			.captureVisibleTab({ format: 'png', quality: 90 })
			.then((dataUrl) => sendResponse({ success: true, dataUrl }))
			.catch((err) => sendResponse({ success: false, error: String(err) }));
		return true; // keep message channel open for async response
	}

	if (message.type === 'SAVE_AREA_SCREENSHOT') {
		// Get tab info from the sender tab, then POST to the SvelteKit server
		const tabId = sender.tab?.id;
		const tabTitle = sender.tab?.title || 'Area screenshot';
		const tabUrl = sender.tab?.url || '';

		getApiBase().then((apiBase) => {
			fetch(`${apiBase}/api/capture`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'screenshot',
					title: tabTitle,
					sourceUrl: tabUrl,
					imageBase64: message.dataUrl
				})
			})
				.then((r) => r.json())
				.then((data) => {
					sendResponse({ success: data.success, pageId: data.pageId, apiBase });
					// Badge flash to signal success
					if (tabId !== undefined && data.success) {
						chrome.action.setBadgeText({ text: '✓', tabId });
						chrome.action.setBadgeBackgroundColor({ color: '#1D9E75', tabId });
						setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 2000);
					}
				})
				.catch((err) => sendResponse({ success: false, error: String(err) }));
		});
		return true;
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
