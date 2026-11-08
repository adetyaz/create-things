/**
 * Background worker: every way of saving that isn't the popup (right-click, shortcuts, the area
 * picker, site savers' Save buttons), the on-page toast's Undo and "keep as reference"
 * switch, screenshots for the popup, and the badge showing reviews due.
 */
import {
	actOnReminder,
	api,
	capture,
	checkReminders,
	type Reminder,
	type ReminderAction,
	getPet,
	MOOD_COLOR,
	imageAsJpeg,
	isSavableUrl,
	NotConnected,
	setReference,
	splitDataUrl,
	undoSave,
	type Capture,
	type SavedItem
} from '../lib/api';
import type { SiteSave } from '../sites/types';

const BADGE_ALARM = 'refresh-badge';
/** How often reminders are checked (the server decides what's due; it's cheap). */
const REMINDER_ALARM = 'check-reminders';
const REMINDER_MINUTES = 5;

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
	chrome.alarms.create(REMINDER_ALARM, { periodInMinutes: REMINDER_MINUTES });
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
chrome.runtime.onStartup.addListener(() => {
	void refreshBadge();
	chrome.alarms.create(REMINDER_ALARM, { periodInMinutes: REMINDER_MINUTES });
});
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === BADGE_ALARM) void refreshBadge();
	if (alarm.name === REMINDER_ALARM) void showReminders();
});

/** The badge: today's reviews as the number, the pet's mood as the colour. */
async function refreshBadge(): Promise<void> {
	try {
		// The number is today's reviews; the colour is the pet's mood. A dot means the pet needs
		// feeding and there are no reviews. The popup explains both.
		const [{ cards }, pet] = await Promise.all([
			api<{ cards: unknown[] }>('/api/reviews'),
			getPet().catch(() => null)
		]);
		const needsFood = !!pet && !['happy', 'resting'].includes(pet.mood);
		await chrome.action.setBadgeText({
			text: cards.length > 0 ? String(cards.length) : needsFood ? '•' : ''
		});
		await chrome.action.setBadgeBackgroundColor({
			color: pet ? MOOD_COLOR[pet.mood] : '#6d28d9'
		});
	} catch (e) {
		await chrome.action.setBadgeText({ text: e instanceof NotConnected ? '!' : '' });
	}
}

/** The two buttons a notification can hold: the most useful actions for its kind. */
function buttonsFor(reminder: Reminder): Reminder['actions'] {
	const preferred: ReminderAction[] = ['done', 'move', 'open'];
	return preferred
		.flatMap((action) => reminder.actions.filter((a) => a.action === action))
		.slice(0, 2);
}

/** New reminders become system notifications, in the pet's voice, with up to two buttons. */
async function showReminders(): Promise<void> {
	try {
		const { fresh } = await checkReminders();
		for (const reminder of fresh) {
			const buttons = buttonsFor(reminder);
			await chrome.storage.session.set({
				[`reminder:${reminder.id}`]: buttons.map((b) => b.action)
			});
			chrome.notifications.create(`reminder:${reminder.id}`, {
				type: 'basic',
				iconUrl: 'icons/icon128.png',
				title: reminder.title,
				message: reminder.body,
				buttons: buttons.map((b) => ({ title: b.label.slice(0, 40) })),
				priority: 1
			});
		}
		if (fresh.length) void refreshBadge();
	} catch {
		// Not connected or offline: the popup says so; try again next time.
	}
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, index) => {
	if (!notificationId.startsWith('reminder:')) return;
	const id = notificationId.slice('reminder:'.length);
	const stored = await chrome.storage.session.get(notificationId);
	const action = (stored[notificationId] as ReminderAction[] | undefined)?.[index];
	if (action) await actOnReminder(id, action).catch(() => null);
	chrome.notifications.clear(notificationId);
	void refreshBadge();
});

// Clicking the notification itself opens the popup, where the reminder and its actions wait.
chrome.notifications.onClicked.addListener((notificationId) => {
	if (!notificationId.startsWith('reminder:')) return;
	chrome.notifications.clear(notificationId);
	void chrome.action.openPopup?.().catch(() => null);
});

function flash(tabId: number | undefined, ok: boolean) {
	if (tabId === undefined) return;
	void chrome.action.setBadgeText({ text: ok ? '✓' : '×', tabId });
	void chrome.action.setBadgeBackgroundColor({ color: ok ? '#15803d' : '#b91c1c', tabId });
	setTimeout(() => void chrome.action.setBadgeText({ text: '', tabId }), 2000);
}

/** The card in the toast: a thumbnail (or what kind of thing it is), a title and a detail line. */
export interface Shown {
	kind: 'link' | 'text' | 'image';
	title: string;
	detail?: string;
	/** A data URL (screenshots, saved images) or the page's own preview image. */
	image?: string;
}

/** What the page script needs to show the toast. */
export type ToastMessage =
	| {
			type: 'SHOW_SAVED';
			ok: true;
			item: SavedItem;
			reference: boolean;
			/** What was saved, so you can check it before the toast goes. */
			shown: Shown;
	  }
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

function hostOf(url: string | undefined): string | undefined {
	try {
		return url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
	} catch {
		return undefined;
	}
}

const quote = (text: string, max = 120) =>
	`“${text.replace(/\s+/g, ' ').trim().slice(0, max)}${text.length > max ? '…' : ''}”`;

/**
 * The toast for a saved capture, showing what was saved. `image` is a preview image for a link
 * (the page's own, or a post's); `kind` marks selected text saved with its page.
 */
function savedToast(
	item: SavedItem,
	input: Capture,
	extra: { image?: string; kind?: Shown['kind'] } = {}
): ToastMessage {
	const base = {
		type: 'SHOW_SAVED',
		ok: true,
		item,
		reference: item.status === 'reference'
	} as const;
	if (input.captureType === 'screenshot') {
		return {
			...base,
			shown: {
				kind: 'image',
				title: input.title ?? item.title,
				detail: hostOf(input.sourceUrl),
				image: `data:${input.mime};base64,${input.image}`
			}
		};
	}
	if (input.captureType === 'note') {
		return { ...base, shown: { kind: 'text', title: quote(input.note) } };
	}
	if (extra.kind === 'text' && input.note) {
		return {
			...base,
			shown: { kind: 'text', title: quote(input.note), detail: `From ${hostOf(input.sourceUrl)}` }
		};
	}
	const host = hostOf(input.sourceUrl);
	return {
		...base,
		shown: {
			kind: 'link',
			title: input.title ?? item.title,
			detail: [host, input.note ? quote(input.note, 80) : null].filter(Boolean).join(' · '),
			image: extra.image
		}
	};
}

/** The page's own preview image (og:image), for the toast only; never sent anywhere. */
async function pageImage(tabId: number | undefined): Promise<string | undefined> {
	if (tabId === undefined) return undefined;
	try {
		const [frame] = await chrome.scripting.executeScript({
			target: { tabId },
			func: () =>
				document.querySelector<HTMLMetaElement>(
					'meta[property="og:image"], meta[name="twitter:image"]'
				)?.content || null
		});
		return (frame?.result as string | null) ?? undefined;
	} catch {
		return undefined;
	}
}

/**
 * Saves, then shows the toast with what was saved, Undo and the reference switch. `page` adds
 * the current page's preview image (saving the page itself).
 */
async function save(
	tabId: number | undefined,
	input: () => Promise<Capture>,
	show: { page?: boolean; kind?: Shown['kind'] } = {}
): Promise<void> {
	try {
		const ready = await input();
		const { item } = await capture(ready);
		const image = show.page ? await pageImage(tabId) : undefined;
		await toast(tabId, savedToast(item, ready, { image, kind: show.kind }));
	} catch (e) {
		await toast(tabId, { type: 'SHOW_SAVED', ok: false, error: errorText(e) });
	}
}

function errorText(e: unknown): string {
	if (e instanceof NotConnected) return 'Not connected: open the createthings button to connect';
	return e instanceof Error ? e.message : String(e);
}

/** A link to an image file (.jpg, .png, … or an images. host), judged from the address. */
function looksLikeImage(url: string | undefined): url is string {
	if (!isSavableUrl(url)) return false;
	const { hostname, pathname } = new URL(url);
	return /\.(jpe?g|png|webp|gif|avif)$/i.test(pathname) || /^images?\./.test(hostname);
}

function pageSource(tab: chrome.tabs.Tab | undefined): string | undefined {
	return isSavableUrl(tab?.url) ? tab.url : undefined;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
	const [kind, what] = String(info.menuItemId).split('-');
	const asReference = kind === 'ref';
	const source = pageSource(tab);
	void save(
		tab?.id,
		async () => {
			// A link straight to an image file (common on photo sites) is saved as the image.
			const imageUrl =
				what === 'image' ? info.srcUrl : looksLikeImage(info.linkUrl) ? info.linkUrl : undefined;
			if (what === 'link' && !imageUrl) {
				if (!isSavableUrl(info.linkUrl)) throw new Error("That link can't be saved");
				return { captureType: 'url', sourceUrl: info.linkUrl, asReference };
			}
			if (what === 'image' || imageUrl) {
				if (!imageUrl) throw new Error('No image found');
				const { mime, base64 } = await imageAsJpeg(imageUrl);
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
		},
		{ page: what === 'page', kind: what === 'text' ? 'text' : undefined }
	);
});

chrome.commands.onCommand.addListener((command, tab) => {
	if (command === 'save-page') {
		void save(
			tab?.id,
			async () => {
				const source = pageSource(tab);
				if (!source) throw new Error("This page can't be saved as a link; try a screenshot");
				return { captureType: 'url', sourceUrl: source, title: tab?.title };
			},
			{ page: true }
		);
	}
	if (command === 'pick-area' && tab?.id !== undefined) void startAreaPicker(tab.id);
});

/** Saves what a site saver read. An image that won't download falls back to the link. */
async function saveSite(
	tabId: number | undefined,
	site: SiteSave,
	asReference: boolean
): Promise<{ success: boolean; error?: string }> {
	const link: Capture = {
		captureType: 'url',
		sourceUrl: site.url,
		title: site.title,
		note: site.text,
		asReference
	};
	try {
		let input: Capture = link;
		if (site.image) {
			const image = await imageAsJpeg(site.image).catch(() => null);
			if (image) {
				input = {
					captureType: 'screenshot',
					image: image.base64,
					mime: image.mime,
					sourceUrl: site.url,
					title: site.title,
					note: site.text,
					asReference
				};
			}
		}
		const { item } = await capture(input);
		// A post whose image didn't download still shows it (the page can load it).
		await toast(tabId, savedToast(item, input, { image: site.image }));
		return { success: true };
	} catch (e) {
		return { success: false, error: errorText(e) };
	}
}

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

	if (message.type === 'SAVE_SITE') {
		// A site saver's button: the image when there is one (pins, shots), else the link.
		const { save: site, asReference } = message as { save: SiteSave; asReference: boolean };
		void saveSite(sender.tab?.id, site, asReference === true).then(sendResponse);
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
