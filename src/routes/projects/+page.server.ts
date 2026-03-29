import { redirect } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad, Actions } from './$types.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) redirect(302, '/');

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) redirect(302, '/');

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	if (!dbIds.projects) return { projects: [] };

	const client = createNotionClient(token);
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const response = await (client.dataSources as any).query({
			data_source_id: dbIds.projects,
			sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
			page_size: 50
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const projects = response.results.map((p: any) => ({
			id: p.id,
			title: p.properties.Title?.title?.[0]?.text?.content || 'Untitled Project',
			status: p.properties.Status?.select?.name || 'Ideating',
			remixTag: p.properties['Remix Tag']?.select?.name || '',
			isPublic: p.properties.Public?.checkbox || false,
			dateStarted: p.properties['Date Started']?.date?.start || '',
			dateCompleted: p.properties['Date Completed']?.date?.start || '',
			lastEdited: p.last_edited_time
		}));

		return { projects };
	} catch {
		return { projects: [] };
	}
};

export const actions: Actions = {
	create: async ({ cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) redirect(302, '/');

		const dbIdsRaw = cookies.get('notion_db_ids');
		if (!dbIdsRaw) redirect(302, '/');

		const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
		const client = createNotionClient(token);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const project = await (client.pages.create as (args: any) => Promise<any>)({
			parent: { data_source_id: dbIds.projects },
			properties: {
				Title: { title: [{ text: { content: 'Untitled Project' } }] },
				Status: { select: { name: 'Ideating' } },
				'Date Started': { date: { start: new Date().toISOString().split('T')[0] } }
			}
		});

		redirect(302, `/projects/${project.id}`);
	}
};
