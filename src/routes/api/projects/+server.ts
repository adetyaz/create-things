import { json, type RequestHandler } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';

/**
 * POST /api/projects
 * Body: { inspirationId: string, title?: string }
 *
 * Creates a new project in the Projects database, linked to the given inspiration.
 * Also updates the inspiration's Status to 'Active'.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) return json({ error: 'Not connected to Notion' }, { status: 401 });

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) return json({ error: 'Databases not set up' }, { status: 400 });

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	const { inspirationId, title } = await request.json();
	if (!inspirationId) return json({ error: 'Missing inspirationId' }, { status: 400 });

	// Get inspiration title if none provided
	let projectTitle = title;
	if (!projectTitle) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const page = (await client.pages.retrieve({ page_id: inspirationId })) as any;
		const inspTitle = page.properties.Title?.title?.[0]?.text?.content || 'Untitled';
		projectTitle = `Project — ${inspTitle}`;
	}

	// Create the project page
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const project = await (client.pages.create as (args: any) => Promise<any>)({
		parent: { data_source_id: dbIds.projects },
		properties: {
			Title: { title: [{ text: { content: projectTitle } }] },
			Status: { select: { name: 'Ideating' } },
			'Date Started': { date: { start: new Date().toISOString().split('T')[0] } },
			Inspiration: { relation: [{ id: inspirationId }] }
		}
	});

	// Update inspiration: set Status to Active and link the new project
	await client.pages.update({
		page_id: inspirationId,
		properties: {
			Status: { select: { name: 'Active' } },
			Projects: { relation: [{ id: project.id }] }
		}
	});

	return json({ success: true, projectId: project.id });
};
