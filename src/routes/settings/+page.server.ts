import { error } from '@sveltejs/kit';
import { WEBHOOK_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN } from '$env/static/private';
import { Redis } from '@upstash/redis';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad, Actions } from './$types.js';

const redis = new Redis({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN });

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	const connected = !!token;

	const figmaFileKey = cookies.get('figma_file_key') || '';
	const figmaConnected = !!figmaFileKey;

	// Get user profile if connected
	let staleThreshold = 14;
	let dormantDays = 7;
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
					dormantDays = props['Dormant Days']?.number || 7;
					platforms = props.Platforms?.multi_select?.map((p: { name: string }) => p.name) || [];
				}
			} catch {
				// Profile DB may not exist yet
			}
		}
	}

	const portfolioUsername = cookies.get('portfolio_username') || '';
	const portfolioPublic = cookies.get('portfolio_public') === 'true';

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
		dormantDays,
		platforms,
		portfolioUsername,
		portfolioPublic,
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

	profile: async ({ request, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected');

		const formData = await request.formData();
		const username = (formData.get('username') as string)?.trim();
		const isPublic = formData.get('portfolioPublic') === 'on';

		if (!username) throw error(400, 'Username is required');

		const dbIds = JSON.parse(cookies.get('notion_db_ids') || '{}');
		const key = `portfolio:${username.toLowerCase()}`;

		if (isPublic) {
			await redis.set(key, { notion_token: token, db_ids: dbIds });
		} else {
			await redis.del(key);
		}

		const cookieOpts = {
			path: '/',
			httpOnly: true,
			sameSite: 'lax' as const,
			maxAge: 60 * 60 * 24 * 365
		};
		cookies.set('portfolio_username', username, cookieOpts);
		cookies.set('portfolio_public', String(isPublic), cookieOpts);

		return { profileSaved: true };
	},

	dormant: async ({ request, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected');

		const formData = await request.formData();
		const days = parseInt(formData.get('dormantDays') as string, 10);
		if (isNaN(days) || days < 1) throw error(400, 'Invalid dormant days');

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
					properties: { 'Dormant Days': { number: days } }
				});
			}
		}

		return { dormantSaved: true };
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
