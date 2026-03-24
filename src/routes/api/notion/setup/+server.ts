import { json } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import { setupNotionDatabases } from '$lib/server/notion/setup.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/notion/setup
 *
 * Manually triggers database creation for an already-connected user.
 * Expects { parentPageId } in the body.
 * The Notion token is read from the cookie.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) {
		return json({ error: 'Not connected to Notion' }, { status: 401 });
	}

	const { parentPageId } = await request.json();
	if (!parentPageId || typeof parentPageId !== 'string') {
		return json({ error: 'parentPageId is required' }, { status: 400 });
	}

	const client = createNotionClient(token);
	const dbIds = await setupNotionDatabases(client, parentPageId);

	cookies.set('notion_db_ids', JSON.stringify(dbIds), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 365
	});

	return json({ success: true, databases: dbIds });
};
