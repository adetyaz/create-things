// Which migrations the database has applied, next to the ones in drizzle/ (read only):
//   node.exe scripts/check-migrations.mjs
// Run before changing or adding a migration. Reads DATABASE_URL from .env; never prints it.
// Cost: nothing (one database read).
import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
	readFileSync('.env', 'utf8')
		.split(/\r?\n/)
		.filter((line) => /^[A-Z_]+=/.test(line))
		.map((line) => [
			line.slice(0, line.indexOf('=')),
			// Values may be wrapped in quotes.
			line
				.slice(line.indexOf('=') + 1)
				.trim()
				.replace(/^(["'])(.*)\1$/, '$2')
		])
);
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set in .env');

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')).entries;
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(
	'select created_at from drizzle.__drizzle_migrations order by created_at'
);
await client.end();

// Drizzle records each applied migration with its journal timestamp ("when").
const applied = new Set(rows.map((r) => Number(r.created_at)));
for (const entry of journal) {
	console.log(`${applied.has(entry.when) ? 'applied    ' : 'NOT applied'}  ${entry.tag}`);
}
console.log(`\n${rows.length} applied in the database, ${journal.length} in drizzle/.`);
