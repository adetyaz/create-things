import { env } from '$env/dynamic/private';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

/** Hyperdrive on Workers (it pools connections); DATABASE_URL anywhere without the binding. */
function connectionString(platform?: App.Platform): string {
	const hyperdrive = platform?.env?.HYPERDRIVE as { connectionString?: string } | undefined;
	const url = hyperdrive?.connectionString ?? env.DATABASE_URL;
	if (!url) throw new Error('No database: bind HYPERDRIVE or set DATABASE_URL');
	return url;
}

/**
 * Runs `work` with a database client for this request, then closes it.
 * One short-lived client per request is the Hyperdrive pattern; Hyperdrive keeps the real pool.
 */
export async function withDb<T>(
	platform: App.Platform | undefined,
	work: (db: NodePgDatabase, client: pg.Client) => Promise<T>
): Promise<T> {
	const client = new pg.Client({ connectionString: connectionString(platform) });
	await client.connect();
	try {
		return await work(drizzle(client), client);
	} finally {
		const closing = client.end();
		if (platform?.ctx) platform.ctx.waitUntil(closing);
		else await closing;
	}
}
