import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('notion_token');
	const dbIds = cookies.get('notion_db_ids');
	return {
		connected: !!(token && dbIds)
	};
};
