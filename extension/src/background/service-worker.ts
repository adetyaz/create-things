/**
 * Background worker: every way of saving that isn't the popup (right-click, shortcuts, the area
 * picker, "Save to createthings" on X posts), the on-page toast's Undo and "keep as reference"
 * switch, screenshots for the popup, and the badge showing reviews due.
 */
import {
	api,
	capture,
	imageAsJpeg,
	isSavableUrl,
	NotConnected,
	setReference,
	splitDataUrl,
	undoSave,
	type Capture,
	type SavedItem
} from '../lib/api';

const BADGE_ALARM = 'refresh-badge';

/** The menu contexts used, as the plain strings Chrome takes. */
type MenuContext = 'link' | 'image' | 'selection' | 'page';

/** Right-click menu items: "save-<what>" or "ref-<what>" (keep as reference). */
const MENUS: {
	what: string;
	context: MenuContext;
	save: string;
	ref: string;
}[] = [
	{ what: 'link', context: 'link', save: 'Save this link', ref: 'Keep this link as a reference' },
	{
		what: 'image',
		context: 'image',
		save: 'Save this image',
		ref: 'Keep this image as a reference'
	},
	{
		what: 'text',
		context: 'selection',
		save: 'Save the selected text',
		ref: 'Keep the selected text as a reference'
	},
	{ what: 'page', context: 'page', save: 'Save this page', ref: 'Keep this page as a reference' }
];

chrome.runtime.onInstalled.addListener(() => {
	chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 30 });
	chrome.contextMenus.removeAll(() => {
		for (const menu of MENUS) {
			chrome.contextMenus.create({
				id: `save-${menu.what}`,
				title: menu.save,
				contexts: [menu.context as chrome.contextMenus.ContextType]
			});
			chrome.contextMenus.create({
				id: `ref-${menu.what}`,
				title: menu.ref,
				contexts: [menu.context as chrome.contextMenus.ContextType]
			});
		}
	});
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

/** What the page script needs to show the toast. */
export type ToastMessage =
	| { type: 'SHOW_SAVED'; ok: true; item: SavedItem; reference: boolean }
	| { type: 'SHOW_SAVED'; ok: false; error: string };

/**
 * Shows the toast on the page. Pages opened before the extension was installed get the page
 * script first; pages it can't touch (browser pages, the store) get the badge instead.
 */
async function toast(tabId: number | undefined, message: ToastMessage): Promise<void> {
	if (tabId === undefined) return;
	try {
		await chrome.tabs.sendMessage(tabId, message);
	} catch {
		try {
			await chrome.scripting.executeScript({ target: { tabId }, files: ['screenshot.js'] });
			await chrome.tabs.sendMessage(tabId, message);
		} catch {
			flash(tabId, message.ok);
		}
	}
}

/** Saves, then shows the toast with Undo and the reference switch. */
async function save(tabId: number | undefined, input: () => Promise<Capture>): Promise<void> {
	try {
		const { item } = await capture(await input());
		await toast(tabId, {
			type: 'SHOW_SAVED',
			ok: true,
			item,
			reference: item.status === 'reference'
		});
	} catch (e) {
		await toast(tabId, { type: 'SHOW_SAVED', ok: false, error: errorText(e) });
	}
}

function errorText(e: unknown): string {
	if (e instanceof NotConnected) return 'Not connected: open the createthings button to connect';
	return e instanceof Error ? e.message : String(e);
}

function pageSource(tab: chrome.tabs.Tab | undefined): string | undefined {
	return isSavableUrl(tab?.url) ? tab.url : undefined;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
	const [kind, what] = String(info.menuItemId).split('-');
	const asReference = kind === 'ref';
	const source = pageSource(tab);
	void save(tab?.id, async () => {
		if (what === 'link') {
			if (!isSavableUrl(info.linkUrl)) throw new Error("That link can't be saved");
			return { captureType: 'url', sourceUrl: info.linkUrl, asReference };
		}
		if (what === 'image') {
			if (!info.srcUrl) throw new Error('No image found');
			const { mime, base64 } = await imageAsJpeg(info.srcUrl);
			return {
				captureType: 'screenshot',
				image: base64,
				mime,
				title: tab?.title,
				sourceUrl: source,
				asReference
			};
		}
		if (what === 'text') {
			const text = info.selectionText?.trim().slice(0, 10_000) ?? '';
			// The page is the source, so analysis reads the text in its context.
			return source
				? { captureType: 'url', sourceUrl: source, note: text, asReference }
				: { captureType: 'note', note: text, asReference };
		}
		if (!source) throw new Error("This page can't be saved as a link; try a screenshot");
		return { captureType: 'url', sourceUrl: source, title: tab?.title, asReference };
	});
});

chrome.commands.onCommand.addListener((command, tab) => {
	if (command === 'save-page') {
		void save(tab?.id, async () => {
			const source = pageSource(tab);
			if (!source) throw new Error("This page can't be saved as a link; try a screenshot");
			return { captureType: 'url', sourceUrl: source, title: tab?.title };
		});
	}
	if (command === 'pick-area' && tab?.id !== undefined) void startAreaPicker(tab.id);
});

/** Starts the area picker, adding the page script first on pages opened before install. */
async function startAreaPicker(tabId: number): Promise<void> {
	try {
		await chrome.tabs.sendMessage(tabId, { type: 'START_AREA_SELECT' });
	} catch {
		try {
			await chrome.scripting.executeScript({ target: { tabId }, files: ['screenshot.js'] });
			await chrome.tabs.sendMessage(tabId, { type: 'START_AREA_SELECT' });
		} catch {
			flash(tabId, false);
		}
	}
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
		void save(sender.tab?.id, async () => ({
			captureType: 'screenshot',
			image: base64,
			mime,
			title: sender.tab?.title || 'Area screenshot',
			sourceUrl: pageSource(sender.tab)
		})).then(() => sendResponse({ success: true }));
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
			.then(async ({ item }) => {
				await toast(sender.tab?.id, {
					type: 'SHOW_SAVED',
					ok: true,
					item,
					reference: item.status === 'reference'
				});
				sendResponse({ success: true });
			})
			.catch((err) => sendResponse({ success: false, error: errorText(err) }));
		return true;
	}

	if (message.type === 'UNDO_SAVE') {
		undoSave(message.itemId)
			.then(() => sendResponse({ success: true }))
			.catch((err) => sendResponse({ success: false, error: errorText(err) }));
		return true;
	}

	if (message.type === 'SET_REFERENCE') {
		setReference(message.itemId, message.reference === true)
			.then(({ item }) => sendResponse({ success: true, item }))
			.catch((err) => sendResponse({ success: false, error: errorText(err) }));
		return true;
	}

	if (message.type === 'REFRESH_BADGE') {
		void refreshBadge().then(() => sendResponse({ success: true }));
		return true;
	}
});
