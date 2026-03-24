import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/notion/status
 *
 * Quick check for the extension/app to know if Notion is connected
 * and whether databases are set up.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	const dbIds = cookies.get('notion_db_ids');

	return json({
		connected: !!token,
		databases: dbIds ? JSON.parse(dbIds) : null
	});
};
