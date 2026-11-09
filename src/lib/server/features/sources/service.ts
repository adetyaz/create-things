/**
 * Connected accounts: OAuth with PKCE (state and verifier in a short-lived encrypted cookie),
 * tokens encrypted at rest and refreshed when they expire, and the Connections view.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { deviceTokens, sourceConnections, userSettings } from '$lib/server/db/schema';
import { optionalEnv, requiredEnv } from '$lib/server/platform/env';
import { challengeOf, decrypt, encrypt, randomToken } from './crypto';
import { SOURCES, sourceOf, type OAuthSource } from './registry';

type Platform = App.Platform | undefined;

export const OAUTH_COOKIE = 'ct_oauth';

export function redirectUri(origin: string, source: string): string {
	return `${origin}/api/sources/${source}/callback`;
}

/** Whether a source's client id and secret are set (.env.example). */
export function configured(source: OAuthSource): boolean {
	return (
		!!optionalEnv(source.clientIdEnv) &&
		!!optionalEnv(source.clientSecretEnv) &&
		!!optionalEnv('SOURCE_TOKEN_KEY')
	);
}

/** The authorize URL to send the user to, and the sealed cookie value holding state + verifier. */
export async function startConnect(source: OAuthSource, userId: string, origin: string) {
	const state = randomToken(16);
	const verifier = randomToken(48);
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: requiredEnv(source.clientIdEnv),
		redirect_uri: redirectUri(origin, source.id),
		scope: source.scopes.join(' '),
		state,
		code_challenge: await challengeOf(verifier),
		code_challenge_method: 'S256',
		...source.authorizeParams
	});
	const cookie = await encrypt(
		JSON.stringify({ state, verifier, userId, source: source.id, at: Date.now() })
	);
	return { url: `${source.authorizeUrl}?${params}`, cookie };
}

interface TokenReply {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string;
}

async function tokenRequest(
	source: OAuthSource,
	body: Record<string, string>
): Promise<TokenReply> {
	const id = requiredEnv(source.clientIdEnv);
	const secret = requiredEnv(source.clientSecretEnv);
	const res = await fetch(source.tokenUrl, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			accept: 'application/json'
		},
		body: new URLSearchParams({ client_id: id, client_secret: secret, ...body })
	});
	const data = (await res.json().catch(() => ({}))) as TokenReply & {
		error?: string;
		message?: string;
	};
	if (!res.ok || !data.access_token) {
		throw new Error(`${source.label} said: ${data.error ?? data.message ?? res.status}`);
	}
	return data;
}

async function saveTokens(
	platform: Platform,
	userId: string,
	source: OAuthSource,
	t: TokenReply,
	keepRefresh?: string | null
) {
	const values = {
		tokenEncrypted: await encrypt(t.access_token),
		refreshEncrypted: t.refresh_token ? await encrypt(t.refresh_token) : (keepRefresh ?? null),
		expiresAt: t.expires_in ? new Date(Date.now() + (t.expires_in - 60) * 1000) : null,
		scopes: t.scope ?? source.scopes.join(' ')
	};
	await withDb(platform, (db) =>
		db
			.insert(sourceConnections)
			.values({ userId, source: source.id, ...values })
			.onConflictDoUpdate({
				target: [sourceConnections.userId, sourceConnections.source],
				set: values
			})
	);
}

export type FinishResult =
	| { status: 'connected'; source: OAuthSource; userId: string }
	| { status: 'invalid'; message: string };

/** The callback: checks state, swaps the code for tokens (with the PKCE verifier), saves them. */
export async function finishConnect(
	platform: Platform,
	sourceId: string,
	origin: string,
	params: URLSearchParams,
	cookie: string | undefined
): Promise<FinishResult> {
	const source = sourceOf(sourceId);
	if (!source) return { status: 'invalid', message: 'Unknown account type' };
	if (params.get('error'))
		return { status: 'invalid', message: `Not connected: ${params.get('error')}` };
	if (!cookie)
		return {
			status: 'invalid',
			message: 'The sign-in took too long or started elsewhere. Try again.'
		};
	let saved: { state: string; verifier: string; userId: string; source: string; at: number };
	try {
		saved = JSON.parse(await decrypt(cookie));
	} catch {
		return { status: 'invalid', message: 'Try connecting again.' };
	}
	if (
		saved.source !== source.id ||
		saved.state !== params.get('state') ||
		Date.now() - saved.at > 15 * 60_000
	) {
		return { status: 'invalid', message: "That sign-in didn't match. Try connecting again." };
	}
	const code = params.get('code');
	if (!code) return { status: 'invalid', message: 'No code came back. Try again.' };
	try {
		const tokens = await tokenRequest(source, {
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri(origin, source.id),
			code_verifier: saved.verifier
		});
		await saveTokens(platform, saved.userId, source, tokens);
		return { status: 'connected', source, userId: saved.userId };
	} catch (e) {
		return { status: 'invalid', message: e instanceof Error ? e.message : String(e) };
	}
}

/** A working access token for a connected source (refreshed if it expired), or null. */
export async function accessToken(
	platform: Platform,
	userId: string,
	sourceId: OAuthSource['id']
): Promise<string | null> {
	const source = sourceOf(sourceId)!;
	const [row] = await withDb(platform, (db) =>
		db
			.select()
			.from(sourceConnections)
			.where(and(eq(sourceConnections.userId, userId), eq(sourceConnections.source, sourceId)))
	);
	if (!row) return null;
	if (!row.expiresAt || row.expiresAt > new Date()) return decrypt(row.tokenEncrypted);
	if (!row.refreshEncrypted) return null;
	const refresh = await decrypt(row.refreshEncrypted);
	const tokens = await tokenRequest(source, {
		grant_type: 'refresh_token',
		refresh_token: refresh
	});
	await saveTokens(platform, userId, source, tokens, row.refreshEncrypted);
	return tokens.access_token;
}

export async function connectionOf(platform: Platform, userId: string, sourceId: string) {
	const [row] = await withDb(platform, (db) =>
		db
			.select()
			.from(sourceConnections)
			.where(and(eq(sourceConnections.userId, userId), eq(sourceConnections.source, sourceId)))
	);
	return row ?? null;
}

export async function setConnectionSettings(
	platform: Platform,
	userId: string,
	sourceId: string,
	settings: Record<string, unknown>
) {
	const row = await connectionOf(platform, userId, sourceId);
	if (!row) return null;
	const merged = { ...(row.settings as Record<string, unknown>), ...settings };
	await withDb(platform, (db) =>
		db
			.update(sourceConnections)
			.set({ settings: merged })
			.where(and(eq(sourceConnections.userId, userId), eq(sourceConnections.source, sourceId)))
	);
	return merged;
}

export async function markSynced(platform: Platform, userId: string, sourceId: string) {
	await withDb(platform, (db) =>
		db
			.update(sourceConnections)
			.set({ lastSyncAt: new Date() })
			.where(and(eq(sourceConnections.userId, userId), eq(sourceConnections.source, sourceId)))
	);
}

/** Disconnecting stops new imports; what already came in stays. */
export async function disconnect(platform: Platform, userId: string, sourceId: string) {
	const rows = await withDb(platform, (db) =>
		db
			.delete(sourceConnections)
			.where(and(eq(sourceConnections.userId, userId), eq(sourceConnections.source, sourceId)))
			.returning({ source: sourceConnections.source })
	);
	return rows.length > 0;
}

/** Settings → Connections (US-110): accounts, the calendar link, and extension devices. */
export async function connections(platform: Platform, userId: string) {
	const [rows, devices, settings] = await Promise.all([
		withDb(platform, (db) =>
			db.select().from(sourceConnections).where(eq(sourceConnections.userId, userId))
		),
		withDb(platform, (db) =>
			db
				.select({
					id: deviceTokens.id,
					label: deviceTokens.label,
					lastUsedAt: deviceTokens.lastUsedAt,
					createdAt: deviceTokens.createdAt
				})
				.from(deviceTokens)
				.where(and(eq(deviceTokens.userId, userId), isNull(deviceTokens.revokedAt)))
				.orderBy(desc(deviceTokens.createdAt))
		),
		withDb(platform, (db) =>
			db
				.select({
					icsUrl: userSettings.icsUrl,
					icsFetchedAt: userSettings.icsFetchedAt,
					feed: userSettings.calendarFeedToken
				})
				.from(userSettings)
				.where(eq(userSettings.userId, userId))
		)
	]);
	return {
		accounts: SOURCES.map((s) => {
			const row = rows.find((r) => r.source === s.id);
			return {
				id: s.id,
				label: s.label,
				brings: s.brings,
				sends: s.sends,
				available: configured(s),
				connected: !!row,
				connectedAt: row?.connectedAt ?? null,
				lastSyncAt: row?.lastSyncAt ?? null,
				settings: row?.settings ?? {}
			};
		}),
		calendarLink: {
			connected: !!settings[0]?.icsUrl,
			lastRead: settings[0]?.icsFetchedAt ?? null,
			feed: !!settings[0]?.feed
		},
		places: [
			{ id: 'extension', label: 'Browser extension', devices },
			{ id: 'phone', label: 'Phone share sheet', note: 'With the installable app (PWA)' }
		]
	};
}
