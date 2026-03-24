import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) throw error(400, 'Databases not set up');

	const client = createNotionClient(token);

	// Fetch the inspiration page
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: params.id })) as any;
	const props = page.properties;

	const inspiration = {
		id: page.id,
		title: props.Title?.title?.[0]?.text?.content || 'Untitled',
		captureType: props['Capture Type']?.select?.name || 'url',
		status: props.Status?.select?.name || 'Pending',
		sourceUrl: props['Source URL']?.url || '',
		dateSaved: props['Date Saved']?.date?.start || '',
		note: props.Notes?.rich_text?.[0]?.text?.content || '',
		imageUrl: props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || ''
	};

	// Fetch linked analysis if available
	const analysisRelation = props.Analysis?.relation;
	let analysis = null;

	if (analysisRelation?.length) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const analysisPage = (await client.pages.retrieve({ page_id: analysisRelation[0].id })) as any;
		const ap = analysisPage.properties;

		analysis = {
			id: analysisPage.id,
			colors: ap.Colors?.rich_text?.[0]?.text?.content || '',
			typography: ap.Typography?.rich_text?.[0]?.text?.content || '',
			layout: ap.Layout?.rich_text?.[0]?.text?.content || '',
			mood: ap.Mood?.multi_select?.map((s: { name: string }) => s.name) || [],
			style: ap.Style?.rich_text?.[0]?.text?.content || '',
			components: ap.Components?.rich_text?.[0]?.text?.content || '',
			attribution: ap.Attribution?.rich_text?.[0]?.text?.content || '',
			forDevelopers: ap['For Developers']?.rich_text?.[0]?.text?.content || '',
			forCreators: ap['For Creators']?.rich_text?.[0]?.text?.content || '',
			roadmapSuggestions: ap['Roadmap Suggestions']?.rich_text?.[0]?.text?.content || ''
		};
	}

	// Check for linked roadmap
	const roadmapRelation = props.Roadmap?.relation;
	const roadmapId = roadmapRelation?.[0]?.id || null;

	// Check for linked projects
	const projectsRelation = props.Projects?.relation;
	const projectIds: string[] = projectsRelation?.map((r: { id: string }) => r.id) || [];

	return { inspiration, analysis, roadmapId, projectIds };
};
