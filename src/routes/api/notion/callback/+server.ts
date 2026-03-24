import { error, redirect } from '@sveltejs/kit';
import { exchangeCodeForToken, createNotionClient } from '$lib/server/notion/client.js';
import { setupNotionDatabases } from '$lib/server/notion/setup.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const savedState = cookies.get('notion_oauth_state');

	if (!code || !state || state !== savedState) {
		error(400, 'Invalid OAuth callback — state mismatch or missing code.');
	}

	cookies.delete('notion_oauth_state', { path: '/' });

	const tokenData = await exchangeCodeForToken(code);

	// Store the token in a secure httpOnly cookie
	cookies.set('notion_token', tokenData.access_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 365 // 1 year
	});

	// Auto-create all 6 databases on first connect
	const client = createNotionClient(tokenData.access_token);

	// Search for an existing createthings workspace page, or create one
	const searchResult = await client.search({
		query: 'createthings',
		filter: { value: 'page', property: 'object' }
	});

	let parentPageId: string;

	if (searchResult.results.length > 0) {
		parentPageId = searchResult.results[0].id;
	} else {
		// Create a root page to hold all databases
		const page = await client.pages.create({
			parent: { type: 'page_id', page_id: '' },
			properties: { title: { title: [{ text: { content: 'createthings' } }] } }
		});
		parentPageId = page.id;
	}

	// Set up all 6 databases
	const dbIds = await setupNotionDatabases(client, parentPageId);

	// Store database IDs as a cookie (will be moved to server-side storage later)
	cookies.set('notion_db_ids', JSON.stringify(dbIds), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 365
	});

	redirect(302, '/?connected=true');
};
