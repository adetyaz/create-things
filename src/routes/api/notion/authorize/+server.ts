import { redirect } from '@sveltejs/kit';
import { getNotionAuthUrl } from '$lib/server/notion/client.js';
import type { RequestHandler } from './$types.js';
import { randomBytes } from 'node:crypto';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = randomBytes(16).toString('hex');
	cookies.set('notion_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 600 // 10 minutes
	});

	const authUrl = getNotionAuthUrl(state);
	redirect(302, authUrl);
};
