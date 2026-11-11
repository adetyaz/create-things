/**
 * Talking to createthings: the API address and the device connection token (from the app's
 * settings, until sign-in exists), stored in extension storage.
 */

/** The app the extension talks to: set at build time for the store (VITE_API_BASE), else local dev. */
export const DEFAULT_API =
	(import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE ??
	'http://localhost:5173';

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

/** Sent with copies and imports: the site's id (no duplicates), its board/folder, no analysis yet. */
export interface CaptureExtras {
	analyse?: boolean;
	external?: { source: 'x' | 'pinterest' | 'arena'; id: string };
	collection?: { source: 'app' | 'x' | 'pinterest' | 'arena'; externalId?: string; title: string };
}

export type Capture = CaptureExtras &
	(
		| {
				captureType: 'url';
				sourceUrl: string;
				title?: string;
				note?: string;
				asReference?: boolean;
		  }
		| { captureType: 'note'; note: string; title?: string; asReference?: boolean }
		| {
				captureType: 'screenshot';
				image: string;
				mime: 'image/png' | 'image/jpeg' | 'image/webp';
				sourceUrl?: string;
				title?: string;
				note?: string;
				asReference?: boolean;
		  }
	);

/** What copies from a site become: ask each time (default), a reference, or a to-do. */
export type Becomes = 'ask' | 'reference' | 'todo';

export interface SiteChoice {
	/** Copy as you go: the site's own save button also saves here. Off until switched on. */
	copy: boolean;
	becomes: Becomes;
}

export const COPY_SITES = [
	{ id: 'x', label: 'X bookmarks', how: 'Bookmarking a post on X also saves it here' },
	{ id: 'pinterest', label: 'Pinterest saves', how: 'Saving a pin also saves it here' }
] as const;

export async function siteChoices(): Promise<Record<string, SiteChoice>> {
	const stored = await chrome.storage.local.get('siteChoices');
	const saved = (stored.siteChoices as Record<string, SiteChoice> | undefined) ?? {};
	return Object.fromEntries(
		COPY_SITES.map((s) => [s.id, saved[s.id] ?? { copy: false, becomes: 'ask' as Becomes }])
	);
}

export async function saveSiteChoice(site: string, choice: SiteChoice) {
	await chrome.storage.local.set({ siteChoices: { ...(await siteChoices()), [site]: choice } });
}

export interface ImportThing {
	url: string;
	externalId: string;
	title?: string;
	text?: string;
}

/** A batch from a board or folder (up to 50), as references without analysis. */
export function importBatch(
	source: 'x' | 'pinterest' | 'arena',
	collection: { externalId?: string; title: string },
	items: ImportThing[]
) {
	return api<{ collectionId: string; added: number; already: number }>('/api/imports', {
		method: 'POST',
		body: JSON.stringify({ source, collection, items })
	});
}

/** The import's one memory, and what analysing it would cost. */
export function importDone(collectionId: string, count: number) {
	return api<{
		summary: string | null;
		analysis: { waiting: number; costEach: number; costAll: number };
	}>('/api/imports/done', { method: 'POST', body: JSON.stringify({ collectionId, count }) });
}

export function analyseCollection(collectionId: string, count: number) {
	return api<{ queued: number; cost: number }>(`/api/collections/${collectionId}/analyse`, {
		method: 'POST',
		body: JSON.stringify({ count })
	});
}

/** "Do this" on a copy: analyse it now (2 credits) as a to-do. */
export async function analyseItem(itemId: string) {
	await setReference(itemId, false).catch(() => null);
	return api(`/api/items/${itemId}/analyze`, { method: 'POST' });
}

export interface FitOffer {
	choice: 'add_step' | 'swap' | 'park' | 'note';
	label: string;
	relatedItemId?: string;
	parkUntil?: string;
}

/** "Fit into a goal": the pet's offers for where it goes (free). */
export function fitOffers(itemId: string) {
	return api<{ related: { title: string } | null; offers: FitOffer[] }>('/api/plan/fit', {
		method: 'POST',
		body: JSON.stringify({ itemId })
	});
}

export function applyFit(itemId: string, offer: FitOffer) {
	return api('/api/plan/fit', {
		method: 'PUT',
		body: JSON.stringify({
			itemId,
			choice: offer.choice,
			relatedItemId: offer.relatedItemId,
			parkUntil: offer.parkUntil
		})
	});
}

export interface SavedItem {
	id: string;
	title: string;
	status: string;
}

const WAITING_KEY = 'waitingSaves';

/** Saves kept on this device while the app can't be reached or the connection is gone. */
export async function waitingSaves(): Promise<Capture[]> {
	const stored = await chrome.storage.local.get(WAITING_KEY);
	return (stored[WAITING_KEY] as Capture[] | undefined) ?? [];
}

async function keepWaiting(input: Capture) {
	await chrome.storage.local.set({ [WAITING_KEY]: [...(await waitingSaves()), input] });
}

export type CaptureResult = { item: SavedItem; waiting?: false } | { item: null; waiting: true };

/**
 * Saves a capture; analysis runs on the server. When the app can't be reached (offline, server
 * down) or the connection was revoked, the save waits on this device and is sent later, oldest
 * first, so nothing is lost.
 */
export async function capture(input: Capture): Promise<CaptureResult> {
	try {
		return await api<{ item: SavedItem }>('/api/items', {
			method: 'POST',
			body: JSON.stringify(input)
		});
	} catch (e) {
		if (e instanceof TypeError || e instanceof NotConnected) {
			await keepWaiting(input);
			return { item: null, waiting: true };
		}
		throw e;
	}
}

/** Sends waiting saves, oldest first; stops at the first that can't go yet. Returns how many went. */
export async function sendWaiting(): Promise<number> {
	const waiting = await waitingSaves();
	let sent = 0;
	for (const input of waiting) {
		try {
			await api('/api/items', { method: 'POST', body: JSON.stringify(input) });
			sent++;
		} catch (e) {
			if (e instanceof TypeError || e instanceof NotConnected) break;
			// The server refused it (e.g. invalid): drop it rather than block the rest.
			sent++;
		}
	}
	if (sent) await chrome.storage.local.set({ [WAITING_KEY]: (await waitingSaves()).slice(sent) });
	return sent;
}

/** A save as the popup's Recent saves list shows it. */
export interface RecentSave {
	id: string;
	title: string;
	status: string;
	captureType: string;
	platform: string | null;
	size: string | null;
	analysisError: string | null;
	note: string | null;
}

/** The latest saves, newest first (until the app has an inbox screen). */
export async function recentSaves(limit = 8): Promise<RecentSave[]> {
	const { items } = await api<{ items: RecentSave[] }>('/api/items');
	return items.slice(0, limit);
}

export type Mood = 'happy' | 'peckish' | 'hungry' | 'starving' | 'ran_away' | 'dead' | 'resting';

/** The pet as GET /api/pet returns it: mood, why, what's next, today's food, recent meals. */
export interface PetView {
	pet: { name: string; species: string; breed: string; personality: string | null; food: string };
	mood: Mood;
	why: string;
	next: string | null;
	today: { eaten: number; limit: number; full: boolean };
	comingHome: { done: number; needed: number } | null;
	history: { label: string; size: 'snack' | 'meal' | 'feast'; at: string }[];
}

export interface SpeciesOption {
	id: string;
	label: string;
	breeds: { id: string; label: string; personality: string; voice: { gentle: string } }[];
}

/** The pet, or null before one is adopted. */
export async function getPet(): Promise<PetView | null> {
	return (await api<{ pet: PetView | null }>('/api/pet')).pet;
}

export async function petSpecies(): Promise<SpeciesOption[]> {
	return (await api<{ species: SpeciesOption[] }>('/api/pet/species')).species;
}

export async function adoptPet(species: string, breed: string, name: string): Promise<PetView> {
	const { pet } = await api<{ pet: PetView }>('/api/pet', {
		method: 'POST',
		body: JSON.stringify({ species, breed, name })
	});
	return pet;
}

/** A one-line check-in; the server works out what it's about and feeds the pet if it's Focus work. */
export function checkIn(body: string) {
	return api<{
		about: { id: string; title: string } | null;
		fed: { status: string; size?: string; name?: string } | null;
		suggestFocus: boolean;
	}>('/api/journal', { method: 'POST', body: JSON.stringify({ kind: 'check_in', body }) });
}

export interface TodayStep {
	stepId: string;
	title: string;
	twoMinute: string | null;
	minutes: number;
	/** "I will spend 25 minutes on … at 08:00", or the goal's name when nothing is planned. */
	line: string;
	/** Busy in your calendar at that time. */
	clash: string | null;
	fromPlan: boolean;
}

/** Today's #1: the first planned block not done, else the current step of a Focus goal. */
export async function todayStep(): Promise<TodayStep | null> {
	const day = await api<{
		first: {
			intention: string;
			step: { id: string; title: string; twoMinute: string | null; minutes: number };
		} | null;
		blocks: { step: { id: string } }[];
		clashes?: ({ busy: string } | null)[];
	}>('/api/plan/day');
	if (day.first) {
		const i = day.blocks.findIndex((b) => b.step.id === day.first!.step.id);
		return {
			stepId: day.first.step.id,
			title: day.first.step.title,
			twoMinute: day.first.step.twoMinute,
			minutes: day.first.step.minutes,
			line: day.first.intention,
			clash: day.clashes?.[i]?.busy ?? null,
			fromPlan: true
		};
	}
	const { focus } = await api<{ focus: { id: string; title: string }[] }>('/api/focus');
	for (const item of focus) {
		const { roadmap } = await api<{
			roadmap: {
				currentStep: {
					id: string;
					title: string;
					twoMinute: string | null;
					minutes: number;
				} | null;
			} | null;
		}>(`/api/items/${item.id}/roadmap`);
		const step = roadmap?.currentStep;
		if (step) {
			return {
				stepId: step.id,
				title: step.title,
				twoMinute: step.twoMinute,
				minutes: step.minutes,
				line: item.title,
				clash: null,
				fromPlan: false
			};
		}
	}
	return null;
}

export function completeStep(stepId: string) {
	return api<{ fed: { status: string; size?: string; name?: string } | null }>(
		`/api/steps/${stepId}/complete`,
		{ method: 'POST' }
	);
}

export interface FocusSession {
	id: string;
	startedAt: string;
	minutes: number;
	stepTitle: string;
}

export async function startFocus(stepId: string, stepTitle: string): Promise<FocusSession> {
	const { session, minutes } = await api<{
		session: { id: string; startedAt: string };
		minutes: number;
	}>('/api/pomodoro', { method: 'POST', body: JSON.stringify({ stepId }) });
	return { id: session.id, startedAt: session.startedAt, minutes, stepTitle };
}

export function endFocus(id: string, note?: string) {
	return api<{ minutes: number; fed: { status: string; size?: string; name?: string } | null }>(
		`/api/pomodoro/${id}/end`,
		{ method: 'POST', body: JSON.stringify(note ? { note } : {}) }
	);
}

/** Badge colour for each mood (the popup explains it). */
export const MOOD_COLOR: Record<Mood, string> = {
	happy: '#15803d',
	resting: '#64748b',
	peckish: '#ca8a04',
	hungry: '#ea580c',
	starving: '#dc2626',
	ran_away: '#475569',
	dead: '#475569'
};

export type ReminderAction = 'start' | 'two_minute' | 'move' | 'done' | 'open' | 'dismiss';

/** A reminder from the pet (GET /api/reminders). */
export interface Reminder {
	id: string;
	kind: string;
	title: string;
	body: string;
	actions: { action: ReminderAction; label: string }[];
	dueAt: string;
}

export interface ReminderCheck {
	fresh: Reminder[];
	open: Reminder[];
	/** Why nothing new went out right now (quiet hours, busy, the daily limit). */
	held: string | null;
	limit: { perDay: number; usedToday: number };
}

/** What's due now; new ones come back in `fresh` once, then in `open` until acted on. */
export function checkReminders(): Promise<ReminderCheck> {
	return api<ReminderCheck>('/api/reminders?channel=extension');
}

export function actOnReminder(id: string, action: ReminderAction) {
	return api<{ status: string }>(`/api/reminders/${id}`, {
		method: 'POST',
		body: JSON.stringify({ action })
	});
}

/** A flashcard due for review (from a finished step's recall question, a quiz, …). */
export interface ReviewCard {
	id: string;
	prompt: string;
	answer: string;
	itemTitle: string | null;
}

export type Rating = 'got_it' | 'shaky' | 'forgot';

/** Today's reviews (up to the daily cap) and how many are due in all. */
export function dueReviews() {
	return api<{ cards: ReviewCard[]; dueTotal: number }>('/api/reviews');
}

/** Rates a card; its next review date moves out (got it) or comes back soon (forgot). */
export function rateReview(cardId: string, rating: Rating) {
	return api<{ card: unknown }>(`/api/reviews/${cardId}`, {
		method: 'POST',
		body: JSON.stringify({ rating })
	});
}

/** Undoes a save (the toast's Undo): the item goes, and any memory it made is hidden. */
export function undoSave(itemId: string) {
	return api<{ removed: true }>(`/api/items/${itemId}`, { method: 'DELETE' });
}

/** Switches a fresh save between "do this" and "keep as reference". */
export function setReference(itemId: string, reference: boolean) {
	return api<{ item: SavedItem }>(`/api/items/${itemId}/reference`, {
		method: 'PUT',
		body: JSON.stringify({ reference })
	});
}

/** Longest side of a right-clicked image before it's sent (keeps uploads small; plenty for analysis). */
const MAX_IMAGE_SIDE = 1600;

/**
 * Downloads a right-clicked image and re-encodes it as JPEG, so any format (GIF, AVIF, huge PNGs)
 * arrives small and readable. SVGs can't be drawn here, so those fail with a clear message.
 */
export async function imageAsJpeg(src: string): Promise<{ mime: 'image/jpeg'; base64: string }> {
	const res = await fetch(src);
	if (!res.ok) throw new Error(`Couldn't download the image (${res.status})`);
	const blob = await res.blob();
	if (blob.type.includes('svg')) throw new Error("SVG images can't be saved yet; try a screenshot");
	const bitmap = await createImageBitmap(blob);
	const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
	const canvas = new OffscreenCanvas(
		Math.round(bitmap.width * scale),
		Math.round(bitmap.height * scale)
	);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
	const bytes = new Uint8Array(await jpeg.arrayBuffer());
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return { mime: 'image/jpeg', base64: btoa(binary) };
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
