/**
 * POST /api/figma/export
 *
 * Exports an inspiration image to Figma.
 * Body: { inspirationId, fileKey? }
 */
import { json, error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import { exportToFigma } from '$lib/server/figma/export.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const body = await request.json();
	const { inspirationId, fileKey } = body as { inspirationId: string; fileKey?: string };

	if (!inspirationId) throw error(400, 'Missing inspirationId');

	const client = createNotionClient(token);

	// Get figma file key from cookies/settings or from request
	const figmaFileKey = fileKey || cookies.get('figma_file_key');
	if (!figmaFileKey) {
		throw error(400, 'No Figma file key configured — connect Figma in settings');
	}

	// Fetch inspiration page for image + metadata
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: inspirationId })) as any;
	const props = page.properties;

	const imageUrl =
		props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || '';
	const title = props.Title?.title?.[0]?.text?.content || 'Untitled';
	const sourceUrl = props['Source URL']?.url || '';

	if (!imageUrl) {
		throw error(400, 'No image found on this inspiration');
	}

	const result = await exportToFigma({
		fileKey: figmaFileKey,
		imageUrl,
		title,
		sourceUrl
	});

	if (!result.success) {
		throw error(500, result.error || 'Figma export failed');
	}

	return json({ success: true, nodeId: result.nodeId });
};
