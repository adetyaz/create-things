import { dev } from '$app/environment';
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { optionalEnv } from '$lib/server/platform/env';

/**
 * One Walrus namespace per user, so recall never mixes users. Local runs write to a separate
 * `createthings-dev-*` space, keeping test memories apart from real ones. Walrus can't erase
 * memories, so deleting moves the user to a new version and the old one is never read again
 * (Breakdown §13).
 */
export function namespaceFor(userId: string, version = 0): string {
	const local = dev || optionalEnv('LOCAL_DEV') === 'true';
	const prefix =
		optionalEnv('MEMORY_NAMESPACE_PREFIX') ?? (local ? 'createthings-dev' : 'createthings');
	const base = `${prefix}-${userId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	return version > 0 ? `${base}-v${version}` : base;
}

/** The namespace the user's memories are read from and written to now. */
export async function currentNamespace(
	platform: App.Platform | undefined,
	userId: string
): Promise<string> {
	const [row] = await withDb(platform, (db) =>
		db
			.select({ version: userSettings.memoryNamespaceVersion })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
	);
	return namespaceFor(userId, row?.version ?? 0);
}
