import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const client = createNotionClient(token);

	// Fetch the roadmap page
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: params.id })) as any;
	const props = page.properties;

	const roadmap = {
		id: page.id,
		title: props.Title?.title?.[0]?.text?.content || 'Untitled Roadmap',
		skills: props.Skills?.rich_text?.[0]?.text?.content || '',
		milestones: props.Milestones?.rich_text?.[0]?.text?.content || '',
		resources: props.Resources?.rich_text?.[0]?.text?.content || '',
		progress: props.Progress?.select?.name || 'Not started'
	};

	// Get linked inspiration
	const inspirationRelation = props.Inspiration?.relation;
	let inspirationId: string | null = null;
	let inspirationTitle = '';

	if (inspirationRelation?.length) {
		inspirationId = inspirationRelation[0].id;
		const inspirationPage = (await client.pages.retrieve({
			page_id: inspirationRelation[0].id
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		})) as any;
		inspirationTitle = inspirationPage.properties.Title?.title?.[0]?.text?.content || 'Untitled';
	}

	return { roadmap, inspirationId, inspirationTitle };
};
