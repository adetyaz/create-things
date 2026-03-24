import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const client = createNotionClient(token);

	// Fetch the project page
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: params.id })) as any;
	const props = page.properties;

	const project = {
		id: page.id,
		title: props.Title?.title?.[0]?.text?.content || 'Untitled Project',
		status: props.Status?.select?.name || 'Ideating',
		remixTag: props['Remix Tag']?.select?.name || '',
		journal: props.Journal?.rich_text?.[0]?.text?.content || '',
		isPublic: props.Public?.checkbox || false,
		dateStarted: props['Date Started']?.date?.start || '',
		dateCompleted: props['Date Completed']?.date?.start || ''
	};

	// Get linked inspirations
	const inspirationRelation = props.Inspiration?.relation || [];
	const inspirations: { id: string; title: string }[] = [];

	for (const rel of inspirationRelation) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ip = (await client.pages.retrieve({ page_id: rel.id })) as any;
		inspirations.push({
			id: ip.id,
			title: ip.properties.Title?.title?.[0]?.text?.content || 'Untitled'
		});
	}

	return { project, inspirations };
};

export const actions: Actions = {
	saveJournal: async ({ request, params, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected to Notion');

		const client = createNotionClient(token);
		const formData = await request.formData();
		const journal = formData.get('journal') as string;

		await client.pages.update({
			page_id: params.id,
			properties: {
				Journal: { rich_text: [{ text: { content: journal || '' } }] }
			}
		});

		return { success: true };
	}
};
