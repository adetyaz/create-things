import { error } from '@sveltejs/kit';
import { WEBHOOK_SECRET } from '$env/static/private';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	const connected = !!token;

	const figmaFileKey = cookies.get('figma_file_key') || '';
	const figmaConnected = !!figmaFileKey;

	// Get user profile if connected
	let staleThreshold = 14;
	let platforms: string[] = [];

	if (token) {
		const dbIds = JSON.parse(cookies.get('notion_db_ids') || '{}');
		if (dbIds.userProfile) {
			const client = createNotionClient(token);
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await (client.dataSources as any).query({
					data_source_id: dbIds.userProfile,
					page_size: 1
				});
				if (response.results.length) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const props = (response.results[0] as any).properties;
					staleThreshold = props['Stale Threshold']?.number || 14;
					platforms = props.Platforms?.multi_select?.map((p: { name: string }) => p.name) || [];
				}
			} catch {
				// Profile DB may not exist yet
			}
		}
	}

	// Build webhook config for Notion Automation setup (item 22)
	const dbIds = connected ? JSON.parse(cookies.get('notion_db_ids') || '{}') : {};
	const notionToken = token || '';
	const webhookBody = JSON.stringify(
		{
			page_id: '{{trigger.page.id}}',
			notion_token: notionToken,
			db_ids: dbIds
		},
		null,
		2
	);

	return {
		connected,
		figmaConnected,
		figmaFileKey,
		staleThreshold,
		platforms,
		webhookSecret: WEBHOOK_SECRET,
		webhookBody
	};
};

export const actions: Actions = {
	figma: async ({ request, cookies }) => {
		const formData = await request.formData();
		const fileKey = (formData.get('fileKey') as string)?.trim();

		if (!fileKey) throw error(400, 'Figma file key is required');

		cookies.set('figma_file_key', fileKey, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});

		return { figmaSaved: true };
	},

	stale: async ({ request, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected');

		const formData = await request.formData();
		const threshold = parseInt(formData.get('threshold') as string, 10);
		if (isNaN(threshold) || threshold < 1) throw error(400, 'Invalid threshold');

		const client = createNotionClient(token);
		const dbIds = JSON.parse(cookies.get('notion_db_ids') || '{}');

		if (dbIds.userProfile) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await (client.dataSources as any).query({
				data_source_id: dbIds.userProfile,
				page_size: 1
			});
			if (response.results.length) {
				await client.pages.update({
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					page_id: (response.results[0] as any).id,
					properties: {
						'Stale Threshold': { number: threshold }
					}
				});
			}
		}

		return { staleSaved: true };
	}
};
