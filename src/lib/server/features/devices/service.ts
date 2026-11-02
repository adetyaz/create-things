/**
 * Device connection tokens: the browser extension connects with one until sign-in exists. The
 * token is shown once; only its SHA-256 is stored.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { deviceTokens } from '$lib/server/db/schema';

type Platform = App.Platform | undefined;

export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A new token for a device. The plain token is returned once and never stored. */
export async function createToken(
	platform: Platform,
	userId: string,
	label: string
): Promise<{ id: string; token: string; label: string }> {
	const token = `ct_${[...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
	const [row] = await withDb(platform, async (db) =>
		db
			.insert(deviceTokens)
			.values({ userId, label, tokenHash: await hashToken(token) })
			.returning({ id: deviceTokens.id })
	);
	return { id: row.id, token, label };
}

export function listTokens(platform: Platform, userId: string) {
	return withDb(platform, (db) =>
		db
			.select({
				id: deviceTokens.id,
				label: deviceTokens.label,
				createdAt: deviceTokens.createdAt,
				lastUsedAt: deviceTokens.lastUsedAt
			})
			.from(deviceTokens)
			.where(and(eq(deviceTokens.userId, userId), isNull(deviceTokens.revokedAt)))
			.orderBy(desc(deviceTokens.createdAt))
	);
}

export async function revokeToken(
	platform: Platform,
	userId: string,
	id: string
): Promise<boolean> {
	const rows = await withDb(platform, (db) =>
		db
			.update(deviceTokens)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(deviceTokens.id, id),
					eq(deviceTokens.userId, userId),
					isNull(deviceTokens.revokedAt)
				)
			)
			.returning({ id: deviceTokens.id })
	);
	return rows.length > 0;
}

/** The user a token belongs to, or null if it's unknown or revoked. Notes when it was last used. */
export async function userForToken(platform: Platform, token: string): Promise<string | null> {
	const tokenHash = await hashToken(token);
	return withDb(platform, async (db) => {
		const [row] = await db
			.update(deviceTokens)
			.set({ lastUsedAt: new Date() })
			.where(and(eq(deviceTokens.tokenHash, tokenHash), isNull(deviceTokens.revokedAt)))
			.returning({ userId: deviceTokens.userId });
		return row?.userId ?? null;
	});
}
