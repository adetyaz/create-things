import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import { publishToBuffer } from '$lib/server/publish/buffer.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const client = createNotionClient(token);
	const dbIds = JSON.parse(cookies.get('notion_db_ids') || '{}');

	if (!dbIds.publishQueue) {
		return { entries: [] };
	}

	// Query the Publish Queue — show all entries ordered by status
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response = await (client.dataSources as any).query({
		data_source_id: dbIds.publishQueue,
		sorts: [{ property: 'Status', direction: 'ascending' }]
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const entries = response.results.map((page: any) => {
		const props = page.properties;
		return {
			id: page.id,
			title: props.Title?.title?.[0]?.text?.content || 'Untitled',
			status: props.Status?.select?.name || 'Draft',
			captionTwitter: props['Caption Twitter']?.rich_text?.[0]?.text?.content || '',
			captionLinkedIn: props['Caption LinkedIn']?.rich_text?.[0]?.text?.content || '',
			captionInstagram: props['Caption Instagram']?.rich_text?.[0]?.text?.content || '',
			captionReddit: props['Caption Reddit']?.rich_text?.[0]?.text?.content || '',
			creditLine: props['Credit Line']?.rich_text?.[0]?.text?.content || '',
			hashtags: props.Hashtags?.rich_text?.[0]?.text?.content || '',
			platforms: props.Platforms?.multi_select?.map((p: { name: string }) => p.name) || [],
			publishedAt: props['Published At']?.date?.start || null,
			projectId: props.Project?.relation?.[0]?.id || null
		};
	});

	return { entries };
};

export const actions: Actions = {
	approve: async ({ request, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected to Notion');

		const formData = await request.formData();
		const entryId = formData.get('entryId') as string;
		if (!entryId) throw error(400, 'Missing entry ID');

		const client = createNotionClient(token);

		// Fetch the full page to get captions + platforms
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const page = (await client.pages.retrieve({ page_id: entryId })) as any;
		const props = page.properties;
		const platforms: string[] =
			props.Platforms?.multi_select?.map((p: { name: string }) => p.name) || [];

		const captionMap: Record<string, string> = {
			twitter: props['Caption Twitter']?.rich_text?.[0]?.text?.content || '',
			linkedin: props['Caption LinkedIn']?.rich_text?.[0]?.text?.content || '',
			instagram: props['Caption Instagram']?.rich_text?.[0]?.text?.content || '',
			reddit: props['Caption Reddit']?.rich_text?.[0]?.text?.content || ''
		};

		// Publish to each selected platform
		const results = await Promise.allSettled(
			platforms.map((platform) =>
				publishToBuffer({
					platform,
					text: captionMap[platform.toLowerCase()] || captionMap.twitter
				})
			)
		);

		// Mark as Published in Notion
		await client.pages.update({
			page_id: entryId,
			properties: {
				Status: { select: { name: 'Published' } },
				'Published At': { date: { start: new Date().toISOString() } }
			}
		});

		return { success: true, results };
	}
};
