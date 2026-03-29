import type { Client } from '@notionhq/client';
import { getDbSchemas, linkDatabases, type DatabaseIds } from './databases.js';

/**
 * Finds existing databases under the parent page, or creates them if missing.
 * Safe to call on every login — will never create duplicates.
 *
 * Returns the data_source ID map so they can be stored in the cookie.
 */
export async function setupNotionDatabases(
	client: Client,
	parentPageId: string
): Promise<DatabaseIds> {
	const schemas = getDbSchemas();

	// Enumerate all child blocks of the parent page to find existing databases.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const childrenResp = await (client.blocks.children.list as any)({
		block_id: parentPageId,
		page_size: 100
	});

	// Build name → block ID map. First occurrence of each name wins (oldest = real data).
	const existingByName = new Map<string, string>();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	for (const block of childrenResp.results as any[]) {
		if (block.type === 'child_database') {
			const title: string = block.child_database?.title ?? '';
			if (title && !existingByName.has(title)) {
				existingByName.set(title, block.id);
			}
		}
	}

	const ids = {} as DatabaseIds;

	await Promise.all(
		schemas.map(async (schema) => {
			if (existingByName.has(schema.name)) {
				// Already exists — retrieve to get its data_source ID.
				const dbId = existingByName.get(schema.name)!;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const db = (await client.databases.retrieve({ database_id: dbId })) as any;
				ids[schema.key] = db.data_sources[0].id;
			} else {
				// Missing — create it now.
				const result = (await client.databases.create({
					parent: { type: 'page_id', page_id: parentPageId },
					title: [{ type: 'text', text: { content: schema.name } }],
					initial_data_source: { properties: schema.properties as any }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} as any)) as any;
				ids[schema.key] = result.data_sources[0].id;
			}
		})
	);

	// Re-applying relations is safe even if they already exist.
	await linkDatabases(client, ids);

	return ids;
}
