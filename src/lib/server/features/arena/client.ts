/**
 * Are.na API v3 calls (Breakdown §2). Rate limits per minute: 30 guest, 120 free, 300 premium,
 * 600 supporter; calls are spaced to stay well under the free limit.
 * Endpoints marked "confirm" are from the v3 docs as read on 2 Nov 2026; check them with the first
 * real connection (needs-input.md K2).
 */
const API = 'https://api.are.na/v3';
/** Space between calls: ~100 a minute at most. */
const GAP_MS = 600;

let last = 0;
async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
	const wait = last + GAP_MS - Date.now();
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	last = Date.now();
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			authorization: `Bearer ${token}`,
			accept: 'application/json',
			...(init.body ? { 'content-type': 'application/json' } : {}),
			...(init.headers ?? {})
		}
	});
	if (res.status === 429) throw new Error('Are.na asked us to slow down; the next sync continues');
	if (!res.ok) throw new Error(`Are.na ${path} → ${res.status}`);
	return (await res.json()) as T;
}

export interface ArenaChannel {
	id: number;
	slug: string;
	title: string;
	length?: number;
	counts?: { contents?: number };
}

export interface ArenaBlock {
	id: number;
	type?: string;
	base_type?: string;
	title?: string | null;
	content?: string | { plain?: string; markdown?: string } | null;
	description?: string | { plain?: string } | null;
	source?: { url?: string | null } | null;
	image?: { src?: string; large?: { url?: string }; original?: { url?: string } } | null;
	attachment?: { url?: string } | null;
	embed?: { url?: string } | null;
}

interface Page<T> {
	data: T[];
	meta?: { has_more_pages?: boolean; current_page?: number };
}

/** The connected user (confirm: GET /v3/me). */
export function me(token: string) {
	return call<{ id: number; slug: string; name?: string }>(token, '/me');
}

/** The user's channels (confirm: GET /v3/users/{id}/contents?type=Channel). */
export async function myChannels(token: string, userId: number, page = 1) {
	const res = await call<Page<ArenaChannel>>(
		token,
		`/users/${userId}/contents?type=Channel&per=50&page=${page}`
	);
	return { channels: res.data ?? [], more: !!res.meta?.has_more_pages };
}

/** One page of a channel's blocks, newest first (GET /v3/channels/{id}/contents). */
export async function channelPage(token: string, channelId: number | string, page: number) {
	const res = await call<Page<ArenaBlock>>(
		token,
		`/channels/${channelId}/contents?per=100&page=${page}&sort=position_desc`
	);
	return {
		blocks: (res.data ?? []).filter((b) => (b.base_type ?? b.type) !== 'Channel'),
		more: !!res.meta?.has_more_pages
	};
}

/** Adds a block to a channel (confirm: POST /v3/blocks { value, channel_ids }). */
export function addBlock(token: string, channelId: number, value: string, description?: string) {
	return call<{ id: number }>(token, '/blocks', {
		method: 'POST',
		body: JSON.stringify({ value, description, channel_ids: [channelId] })
	});
}

const text = (v: ArenaBlock['content']): string | undefined =>
	typeof v === 'string' ? v : (v?.plain ?? v?.markdown ?? undefined);

/** A block as something to save: Image → its image, Link → url, Text → note, others → url. */
export function blockToSave(block: ArenaBlock) {
	const url =
		block.source?.url ??
		block.attachment?.url ??
		block.embed?.url ??
		`https://www.are.na/block/${block.id}`;
	const note = text(block.content) ?? text(block.description as ArenaBlock['content']);
	return {
		url: /^https?:\/\//.test(url) ? url : `https://www.are.na/block/${block.id}`,
		externalId: String(block.id),
		title: block.title?.slice(0, 200) || undefined,
		text: note?.slice(0, 2000) || undefined,
		image: block.image?.large?.url ?? block.image?.src ?? block.image?.original?.url
	};
}
