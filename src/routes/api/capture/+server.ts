import { json, type RequestHandler } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';

/**
 * POST /api/capture
 *
 * Receives capture payloads from the browser extension and creates
 * entries in the Notion Inspiration Vault database.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) {
		return json({ success: false, error: 'Not connected to Notion' }, { status: 401 });
	}

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) {
		return json({ success: false, error: 'Databases not set up' }, { status: 400 });
	}

	const dbIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	const body = await request.json();
	const { type, title, sourceUrl, imageBase64, note } = body;

	if (!type || !['screenshot', 'url', 'upload', 'note'].includes(type)) {
		return json({ success: false, error: 'Invalid capture type' }, { status: 400 });
	}

	// Build properties for the Inspiration Vault entry
	const properties: Record<string, unknown> = {
		Title: { title: [{ text: { content: title || `${type} capture` } }] },
		'Capture Type': { select: { name: type } },
		Status: { select: { name: 'Pending' } },
		'Date Saved': { date: { start: new Date().toISOString() } }
	};

	if (sourceUrl) {
		properties['Source URL'] = { url: sourceUrl };
	}

	if (note) {
		properties.Notes = { rich_text: [{ text: { content: note } }] };
	}

	// Build children blocks (page content)
	const children: Record<string, unknown>[] = [];

	if (note) {
		children.push({
			object: 'block',
			type: 'paragraph',
			paragraph: { rich_text: [{ text: { content: note } }] }
		});
	}

	if (imageBase64) {
		// Notion API doesn't accept base64 directly for external images.
		// For now, store the base64 reference in a code block.
		// In production, upload to cloud storage first, then use external URL.
		children.push({
			object: 'block',
			type: 'paragraph',
			paragraph: {
				rich_text: [{ text: { content: '[Image captured — awaiting upload pipeline]' } }]
			}
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = await (client.pages.create as (args: any) => Promise<any>)({
		parent: { database_id: dbIds.inspirationVault },
		properties,
		...(children.length > 0 ? { children } : {})
	});

	return json({ success: true, pageId: page.id });
};
