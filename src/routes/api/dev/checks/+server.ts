import { error, json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { optionalEnv } from '$lib/server/platform/env';
import { eq, sql } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { getExchangeRate, suiClient } from '$lib/server/integrations/tatum';

const CHECKS_NAMESPACE = 'createthings-checks';

/**
 * GET /api/dev/checks
 * Live checks for Postgres, Walrus Memory and Tatum. Only on in `vite dev`,
 * or under `wrangler dev` with DEV_CHECKS=1. Add `?write=1` to save and recall one memory on mainnet.
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	if (!dev && optionalEnv('DEV_CHECKS') !== '1') error(404);

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
	await check('postgres.schema', () =>
		withDb(platform, async (db) => {
			// Typed insert + read on a real table, rolled back so no row is left behind.
			const rolledBack = new Error('rollback');
			let seen: unknown;
			try {
				await db.transaction(async (tx) => {
					const [row] = await tx
						.insert(items)
						.values({ userId: 'dev-check', title: 'Schema check', captureType: 'note' })
						.returning();
					const [read] = await tx.select().from(items).where(eq(items.id, row.id));
					seen = { id: read.id, status: read.status, savedAt: read.savedAt };
					throw rolledBack;
				});
			} catch (e) {
				if (e !== rolledBack) throw e;
			}
			const [{ left }] = (
				await db.execute(sql`select count(*)::int as left from items where user_id = 'dev-check'`)
			).rows as { left: number }[];
			return { insertedAndRead: seen, rowsLeftAfterRollback: left };
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
	const memoryAccount = optionalEnv('MEMWAL_ACCOUNT_ID');
	if (memoryAccount) {
		await check('tatum.sui.mainnet.memoryAccount', () =>
			suiClient('mainnet').getObject({ objectId: memoryAccount })
		);
	}
	await check('tatum.rate.SUI_USD', () => getExchangeRate('SUI', 'USD'));

	// Analysis libraries on Workers: metadata scraping and color palettes.
	if (url.searchParams.get('libs') === '1') {
		await check('lib.metascraper', async () => {
			const { scrapeMetadata } = await import('$lib/server/integrations/scraper/metadata');
			return scrapeMetadata('https://github.com/MystenLabs/walrus-memory');
		});
		const palette = async (url: string) => {
			const { extractColors } = await import('$lib/server/features/analysis/colors/extract');
			return (await extractColors(url)) ?? 'none (format not decoded on the server)';
		};
		await check('lib.palette.png', () =>
			palette('https://opengraph.githubassets.com/1/MystenLabs/walrus-memory')
		);
		await check('lib.palette.jpeg', () => palette('https://picsum.photos/id/1015/600/400.jpg'));
		await check('lib.palette.webp', () => palette('https://www.gstatic.com/webp/gallery/1.webp'));
	}

	const body = JSON.stringify(
		results,
		(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		2
	);
	return json(JSON.parse(body));
};
