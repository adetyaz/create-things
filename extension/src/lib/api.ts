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
			mime: 'image/png' | 'image/jpeg' | 'image/webp';
			sourceUrl?: string;
			title?: string;
			note?: string;
			asReference?: boolean;
	  };

export interface SavedItem {
	id: string;
	title: string;
	status: string;
}

/** Saves a capture; analysis runs on the server. */
export function capture(input: Capture) {
	return api<{ item: SavedItem }>('/api/items', {
		method: 'POST',
		body: JSON.stringify(input)
	});
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
