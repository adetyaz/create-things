import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { memoryClient } from '$lib/server/memory/walrus';
import { getExchangeRate, suiClient } from '$lib/server/tatum';

const CHECKS_NAMESPACE = 'createthings-checks';

/**
 * GET /api/dev/checks
 * Live checks for Postgres, Walrus Memory and Tatum. Only on in `vite dev`,
 * or under `wrangler dev` with DEV_CHECKS=1. Add `?write=1` to save and recall one memory on mainnet.
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	if (!dev && env.DEV_CHECKS !== '1') error(404);

	const results: Record<string, unknown> = {};
	const check = async (name: string, run: () => Promise<unknown>) => {
		const started = Date.now();
		try {
			const result = await run();
			results[name] = { ok: true, ms: Date.now() - started, result };
		} catch (e) {
			results[name] = {
				ok: false,
				ms: Date.now() - started,
				error: e instanceof Error ? e.message : String(e)
			};
		}
	};

	await check('postgres.via', async () =>
		platform?.env?.HYPERDRIVE ? 'Hyperdrive binding' : 'DATABASE_URL'
	);
	await check('postgres.read', () =>
		withDb(platform, async (db) => {
			const { rows } = await db.execute(
				sql`select current_database() as database, current_user as user, version() as version, now() as now`
			);
			return rows[0];
		})
	);
	await check('postgres.writeRead', () =>
		withDb(platform, async (db) => {
			// A temp table lives only for this connection, so the check never touches real tables.
			const marker = crypto.randomUUID();
			await db.execute(sql`create temp table createthings_check (marker text not null)`);
			await db.execute(sql`insert into createthings_check (marker) values (${marker})`);
			const { rows } = await db.execute(sql`select marker from createthings_check`);
			if (rows[0]?.marker !== marker)
				throw new Error('Read back a different value than was written');
			return { wrote: marker, read: rows[0].marker };
		})
	);

	await check('walrus.health', () => memoryClient(CHECKS_NAMESPACE).health());

	if (url.searchParams.get('write') === '1') {
		const text = `createthings check: Walrus Memory reached from the app at ${new Date().toISOString()}`;
		await check('walrus.rememberAndWait', () =>
			memoryClient(CHECKS_NAMESPACE).rememberAndWait(text)
		);
		await check('walrus.recall', () =>
			memoryClient(CHECKS_NAMESPACE).recall({ query: 'createthings check Walrus Memory', limit: 3 })
		);
	}

	await check('tatum.sui.testnet.chain', () => suiClient('testnet').getChainIdentifier());
	await check('tatum.sui.mainnet.chain', () => suiClient('mainnet').getChainIdentifier());
	if (env.MEMWAL_ACCOUNT_ID) {
		await check('tatum.sui.mainnet.memoryAccount', () =>
			suiClient('mainnet').getObject({ objectId: env.MEMWAL_ACCOUNT_ID! })
		);
	}
	await check('tatum.rate.SUI_USD', () => getExchangeRate('SUI', 'USD'));

	// v1 analysis libraries (Phase 0 #8): do they run on Workers, not just bundle?
	if (url.searchParams.get('libs') === '1') {
		await check('lib.metascraper', async () => {
			const { scrapeMetadata } = await import('$lib/server/scraper/metadata');
			return scrapeMetadata('https://github.com/MystenLabs/walrus-memory');
		});
		await check('lib.nodeVibrant', async () => {
			const { extractColors } = await import('$lib/server/colors/extract');
			return extractColors('https://opengraph.githubassets.com/1/MystenLabs/walrus-memory');
		});
	}

	const body = JSON.stringify(
		results,
		(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		2
	);
	return json(JSON.parse(body));
};
