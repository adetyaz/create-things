import { json, type RequestHandler } from '@sveltejs/kit';
import { WEBHOOK_SECRET } from '$env/static/private';
import { createNotionClient } from '$lib/server/notion/client.js';

/**
 * POST /api/stale-check
 * Called by Notion scheduled automation or Vercel cron.
 * Finds inspirations past the user's stale threshold and marks them Stale.
 */
export const POST: RequestHandler = async ({ request }) => {
	// Auth: Bearer token check
	const authHeader = request.headers.get('authorization');
	if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { token, dbIds } = body;

	if (!token || !dbIds?.inspirationVault) {
		return json({ error: 'Missing token or dbIds' }, { status: 400 });
	}

	const client = createNotionClient(token);

	// Get stale threshold from user profile
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
			// Use default
		}
	}

	const thresholdMs = staleThreshold * 24 * 60 * 60 * 1000;
	const cutoffDate = new Date(Date.now() - thresholdMs).toISOString().split('T')[0];

	// Find items that are Ready or Active and older than the threshold
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response = await (client.databases as any).query({
		database_id: dbIds.inspirationVault,
		filter: {
			and: [
				{
					or: [
						{ property: 'Status', select: { equals: 'Ready' } },
						{ property: 'Status', select: { equals: 'Active' } }
					]
				},
				{ property: 'Date Saved', date: { on_or_before: cutoffDate } }
			]
		}
	});

	let updated = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	for (const page of response.results as any[]) {
		// Double-check with Last Active date if available
		const lastActive = page.properties['Last Active']?.date?.start;
		if (lastActive && new Date(lastActive).getTime() > Date.now() - thresholdMs) {
			continue; // Recently active, skip
		}

		await client.pages.update({
			page_id: page.id,
			properties: { Status: { select: { name: 'Stale' } } }
		});
		updated++;
	}

	return json({ updated, threshold: staleThreshold });
};
