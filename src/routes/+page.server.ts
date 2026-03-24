import { createNotionClient } from '$lib/server/notion/client.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	const dbIdsRaw = cookies.get('notion_db_ids');

	if (!token || !dbIdsRaw) {
		return { connected: false, inspirations: [], staleItems: [] };
	}

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	// Fetch stale threshold from user profile (default: 14 days)
	let staleThreshold = 14;
	if (dbIds.userProfile) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const profileResponse = await (client.databases as any).query({
				database_id: dbIds.userProfile,
				page_size: 1
			});
			if (profileResponse.results.length) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const threshold = (profileResponse.results[0] as any).properties['Stale Threshold']?.number;
				if (threshold && threshold > 0) staleThreshold = threshold;
			}
		} catch {
			// Use default threshold
		}
	}

	// Query the Inspiration Vault, newest first
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response = await (client.databases as any).query({
		database_id: dbIds.inspirationVault,
		sorts: [{ property: 'Date Saved', direction: 'descending' }],
		page_size: 50
	});

	const now = Date.now();
	const thresholdMs = staleThreshold * 24 * 60 * 60 * 1000;

	const stalePageIds: string[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspirations = response.results.map((page: any) => {
		const props = page.properties;
		const status = props.Status?.select?.name || 'Pending';
		const dateSaved = props['Date Saved']?.date?.start || '';
		const lastActive = props['Last Active']?.date?.start || '';

		// Check if this item should become stale
		const referenceDate = lastActive || dateSaved;
		let isStale = false;
		if (referenceDate && (status === 'Ready' || status === 'Active')) {
			const age = now - new Date(referenceDate).getTime();
			if (age > thresholdMs) {
				isStale = true;
				stalePageIds.push(page.id);
			}
		}

		return {
			id: page.id,
			title: props.Title?.title?.[0]?.text?.content || 'Untitled',
			captureType: props['Capture Type']?.select?.name || 'url',
			status: isStale ? 'Stale' : status,
			sourceUrl: props['Source URL']?.url || '',
			dateSaved,
			note: props.Notes?.rich_text?.[0]?.text?.content || '',
			imageUrl: props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || ''
		};
	});

	// Mark stale items in Notion (fire-and-forget)
	for (const pageId of stalePageIds) {
		client.pages
			.update({
				page_id: pageId,
				properties: { Status: { select: { name: 'Stale' } } }
			})
			.catch(() => {});
	}

	const staleItems = inspirations.filter((i: { status: string }) => i.status === 'Stale');

	return { connected: true, inspirations, staleItems };
};
