import { json, type RequestHandler } from '@sveltejs/kit';
import { templateList } from '$lib/server/features/templates/service';

/** GET /api/templates: every user type with its starting settings. */
export const GET: RequestHandler = async () => json({ templates: templateList() });
