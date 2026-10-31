import { dev } from '$app/environment';
import { optionalEnv } from '$lib/server/platform/env';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

/** A database client, as handed to `withDb` callbacks. */
export type Db = NodePgDatabase;

/** Hyperdrive on Workers (it pools connections); DATABASE_URL anywhere without the binding. */
function connectionString(platform?: App.Platform): string {
	const url = platform?.env?.HYPERDRIVE?.connectionString ?? optionalEnv('DATABASE_URL');
	if (!url) throw new Error('No database: bind HYPERDRIVE or set DATABASE_URL');
	return url;
}

/**
 * Under `vite dev` only: one shared pool, because every fresh connection to Neon from a laptop costs
 * seconds. Production keeps one short-lived client per request (the Hyperdrive pattern; Workers
 * can't share connections between requests, and Hyperdrive keeps the real pool).
 */
let devPool: pg.Pool | undefined;

/** Runs `work` with a database client for this request, then releases it. */
export async function withDb<T>(
	platform: App.Platform | undefined,
	work: (db: NodePgDatabase, client: pg.ClientBase) => Promise<T>
): Promise<T> {
	if (dev) {
		devPool ??= new pg.Pool({ connectionString: connectionString(platform), max: 5 });
		const client = await devPool.connect();
		try {
			return await work(drizzle(client), client);
		} finally {
			client.release();
		}
	}

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
