import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('notion_token', { path: '/' });
	cookies.delete('notion_db_ids', { path: '/' });
	cookies.delete('notion_oauth_state', { path: '/' });
	redirect(302, '/');
};
