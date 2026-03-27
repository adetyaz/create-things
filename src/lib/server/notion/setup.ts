import type { Client } from '@notionhq/client';
import { getDbSchemas, linkDatabases, type DatabaseIds } from './databases.js';

/**
 * Creates all 6 Notion databases in the user's workspace and links them via relations.
 * Called once during first-time onboarding after OAuth.
 *
 * Returns the database IDs map so they can be stored.
 */
export async function setupNotionDatabases(
	client: Client,
	parentPageId: string
): Promise<DatabaseIds> {
	const schemas = getDbSchemas();

	// The Notion SDK types for databases.create don't expose `properties` in the
	// TS type, but the REST API fully supports it. Use type assertion here.
	const results = await Promise.all(
		schemas.map((schema) =>
			client.databases.create({
				parent: { type: 'page_id', page_id: parentPageId },
				title: [{ type: 'text', text: { content: schema.name } }],
				initial_data_source: { properties: schema.properties as any }
			})
		)
	);

	const ids = {} as DatabaseIds;
	schemas.forEach((schema, i) => {
		// Store the data_source ID — all queries/updates use dataSources.*
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		ids[schema.key] = (results[i] as any).data_sources[0].id;
	});

	// Add cross-database relation properties
	await linkDatabases(client, ids);

	return ids;
}
