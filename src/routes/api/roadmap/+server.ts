import { json, type RequestHandler } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import { createRoadmap } from '$lib/server/notion/mcp.js';
import { generateRoadmap } from '$lib/server/ai/groq.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';

/**
 * POST /api/roadmap
 *
 * Generates a learning roadmap from an inspiration's analysis via Groq,
 * then writes it to Notion via MCP.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) return json({ error: 'Not connected to Notion' }, { status: 401 });

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) return json({ error: 'Databases not set up' }, { status: 400 });

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	const { inspirationId } = await request.json();
	if (!inspirationId) return json({ error: 'Missing inspirationId' }, { status: 400 });

	// Fetch the inspiration page and its analysis
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspirationPage = (await client.pages.retrieve({ page_id: inspirationId })) as any;
	const iProps = inspirationPage.properties;
	const title = iProps.Title?.title?.[0]?.text?.content || 'Untitled';

	// Get linked analysis
	const analysisRelation = iProps.Analysis?.relation;
	let analysisStyle = '';
	let roadmapSuggestions = '';

	if (analysisRelation?.length) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const analysisPage = (await client.pages.retrieve({ page_id: analysisRelation[0].id })) as any;
		const ap = analysisPage.properties;
		analysisStyle = ap.Style?.rich_text?.[0]?.text?.content || '';
		roadmapSuggestions = ap['Suggestions']?.rich_text?.[0]?.text?.content || '';
	}

	if (!roadmapSuggestions) {
		return json(
			{ error: 'No analysis found — wait for analysis to complete first' },
			{ status: 400 }
		);
	}

	// Generate roadmap via Groq
	const roadmap = await generateRoadmap({
		inspirationTitle: title,
		analysisStyle,
		roadmapSuggestions
	});

	// Write to Notion
	const page = await createRoadmap(client, dbIds, {
		inspirationPageId: inspirationId,
		title: `Roadmap — ${title}`,
		skills: roadmap.skills,
		milestones: roadmap.milestones,
		resources: roadmap.resources
	});

	return json({ success: true, roadmapId: page.id });
};
