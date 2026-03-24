/**
 * POST /api/publish
 *
 * Two modes:
 * 1. "prepare" — reads project data, generates captions via Groq, creates Publish Queue entry
 * 2. "publish" — reads an approved Publish Queue entry and sends to Buffer
 *
 * Called by the app UI or by Notion automation webhook (on status = Approved).
 */
import { json, error } from '@sveltejs/kit';
import { WEBHOOK_SECRET } from '$env/static/private';
import { createNotionClient } from '$lib/server/notion/client.js';
import { generateCaptions } from '$lib/server/ai/groq.js';
import { writePublishDrafts, updatePublishStatus } from '$lib/server/notion/mcp.js';
import { publishToBuffer } from '$lib/server/publish/buffer.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const mode = body.mode as string; // 'prepare' or 'publish'

	if (mode === 'prepare') {
		return handlePrepare(body, cookies);
	} else if (mode === 'publish') {
		return handlePublish(body, request, cookies);
	}

	throw error(400, 'Invalid mode — use "prepare" or "publish"');
};

async function handlePrepare(
	body: {
		projectId: string;
		platforms: string[];
	},
	cookies: { get: (name: string) => string | undefined }
) {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const client = createNotionClient(token);
	const dbIds = JSON.parse(cookies.get('notion_db_ids') || '{}');

	if (!dbIds.publishQueue) {
		throw error(400, 'Publish Queue database not found — run setup first');
	}

	// Fetch the project page
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const projectPage = (await client.pages.retrieve({ page_id: body.projectId })) as any;
	const props = projectPage.properties;

	const projectTitle = props.Title?.title?.[0]?.text?.content || 'Untitled';
	const remixTag = props['Remix Tag']?.select?.name || 'Inspired by';
	const journal = props.Journal?.rich_text?.[0]?.text?.content || '';

	// Get linked inspiration for credit line
	let creditLine = '';
	const inspirationRelation = props.Inspiration?.relation;
	if (inspirationRelation?.length) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inspPage = (await client.pages.retrieve({ page_id: inspirationRelation[0].id })) as any;
		const author = inspPage.properties.Author?.rich_text?.[0]?.text?.content || '';
		const sourceUrl = inspPage.properties['Source URL']?.url || '';
		if (author || sourceUrl) {
			creditLine = `${remixTag} ${author}${sourceUrl ? ` — ${sourceUrl}` : ''}`;
		}
	}

	// Generate captions via Groq
	const captions = await generateCaptions({
		projectTitle,
		remixTag,
		creditLine,
		description: journal.slice(0, 500) // First 500 chars of journal as context
	});

	// Write to Notion Publish Queue
	const entry = await writePublishDrafts(client, dbIds, {
		projectPageId: body.projectId,
		title: `Post — ${projectTitle}`,
		captionTwitter: captions.twitter,
		captionLinkedIn: captions.linkedin,
		captionInstagram: captions.instagram,
		captionReddit: captions.reddit,
		creditLine: captions.creditLine,
		hashtags: captions.hashtags,
		platforms: body.platforms || ['Twitter', 'LinkedIn']
	});

	return json({ entryId: entry.id, captions });
}

async function handlePublish(
	body: { entryId?: string; pageId?: string },
	request: Request,
	cookies: { get: (name: string) => string | undefined }
) {
	// Supports both app-initiated (entryId) and webhook-initiated (pageId + auth header)
	const entryId = body.entryId || body.pageId;
	if (!entryId) throw error(400, 'Missing entry ID');

	// If from webhook, verify secret
	const authHeader = request.headers.get('authorization');
	if (authHeader) {
		const token = authHeader.replace('Bearer ', '');
		if (token !== WEBHOOK_SECRET) {
			throw error(403, 'Invalid webhook secret');
		}
	}

	const notionToken = cookies.get('notion_token');
	if (!notionToken && !authHeader) throw error(401, 'Not connected');

	// For webhook calls, we'd need a stored token — for now, use cookie
	const token = notionToken;
	if (!token) throw error(401, 'No Notion token available');

	const client = createNotionClient(token);

	// Fetch the Publish Queue entry
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: entryId })) as any;
	const props = page.properties;

	const status = props.Status?.select?.name;
	if (status !== 'Approved') {
		throw error(400, `Cannot publish entry with status "${status}" — must be Approved`);
	}

	const platforms = props.Platforms?.multi_select?.map((p: { name: string }) => p.name) || [];
	const captions: Record<string, string> = {
		Twitter: props['Caption Twitter']?.rich_text?.[0]?.text?.content || '',
		LinkedIn: props['Caption LinkedIn']?.rich_text?.[0]?.text?.content || '',
		Instagram: props['Caption Instagram']?.rich_text?.[0]?.text?.content || '',
		Reddit: props['Caption Reddit']?.rich_text?.[0]?.text?.content || ''
	};
	const hashtags = props.Hashtags?.rich_text?.[0]?.text?.content || '';

	// Publish to each selected platform via Buffer
	const results: Record<string, { success: boolean; error?: string }> = {};

	for (const platform of platforms) {
		const caption = captions[platform];
		if (!caption) {
			results[platform] = { success: false, error: 'No caption available' };
			continue;
		}

		try {
			await publishToBuffer({
				platform: platform.toLowerCase(),
				text: `${caption}\n\n${hashtags}`
			});
			results[platform] = { success: true };
		} catch (err) {
			results[platform] = { success: false, error: String(err) };
		}
	}

	// Update status to Published
	await updatePublishStatus(client, entryId, 'Published');

	return json({ published: true, results });
}
