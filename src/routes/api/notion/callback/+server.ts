import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import { exchangeCodeForToken, createNotionClient } from '$lib/server/notion/client.js';
import { setupNotionDatabases } from '$lib/server/notion/setup.js';
import type { RequestHandler } from './$types.js';

const cookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev,
	maxAge: 60 * 60 * 24 * 365 // 1 year
};

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
	cookies.set('notion_token', tokenData.access_token, cookieOpts);

	// Auto-create all 6 databases on first connect
	const client = createNotionClient(tokenData.access_token);

	// Find or create the top-level 'createthings' workspace page.
	// All databases live under this page — no user page-sharing required.
	const searchResult = await client.search({
		query: 'createthings',
		filter: { value: 'page', property: 'object' }
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const existing = searchResult.results.find((r: any) => {
		const titleArr = r.properties?.title?.title ?? r.title;
		const name: string = Array.isArray(titleArr)
			? titleArr.map((t: { plain_text: string }) => t.plain_text).join('')
			: '';
		return name.toLowerCase() === 'createthings';
	});

	let parentPageId: string;

	if (existing) {
		parentPageId = existing.id;
	} else {
		// Create the page at the workspace root — no shared page needed
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const page = await (client.pages.create as (args: any) => Promise<any>)({
			parent: { type: 'workspace', workspace: true },
			properties: { title: { title: [{ text: { content: 'createthings' } }] } }
		});
		parentPageId = page.id;
	}

	// Set up all 6 databases
	const dbIds = await setupNotionDatabases(client, parentPageId);

	// Store database IDs as a cookie
	cookies.set('notion_db_ids', JSON.stringify(dbIds), cookieOpts);

	redirect(302, '/?connected=true');
};
