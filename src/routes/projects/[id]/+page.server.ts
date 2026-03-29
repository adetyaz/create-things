import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad, Actions } from './$types.js';

export interface EditorBlock {
	id: string;
	type: string;
	content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blockToEditor(block: any): EditorBlock | null {
	const id: string = block.id;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const text = (rt: any[]) => rt?.map((t: any) => t.plain_text).join('') || '';
	switch (block.type) {
		case 'paragraph':
			return { id, type: 'paragraph', content: text(block.paragraph?.rich_text) };
		case 'heading_1':
			return { id, type: 'heading_2', content: text(block.heading_1?.rich_text) };
		case 'heading_2':
			return { id, type: 'heading_2', content: text(block.heading_2?.rich_text) };
		case 'heading_3':
			return { id, type: 'heading_3', content: text(block.heading_3?.rich_text) };
		case 'bulleted_list_item':
			return { id, type: 'bulleted_list_item', content: text(block.bulleted_list_item?.rich_text) };
		case 'image':
			return {
				id,
				type: 'image',
				content: block.image?.external?.url || block.image?.file?.url || ''
			};
		case 'video':
			return {
				id,
				type: 'video',
				content: block.video?.external?.url || block.video?.file?.url || ''
			};
		case 'divider':
			return { id, type: 'divider', content: '' };
		default:
			return null;
	}
}

function editorToNotion(block: EditorBlock) {
	const rt = (t: string) => [{ text: { content: t } }];
	switch (block.type) {
		case 'heading_2':
			return {
				object: 'block',
				type: 'heading_2',
				heading_2: { rich_text: rt(block.content) }
			};
		case 'heading_3':
			return {
				object: 'block',
				type: 'heading_3',
				heading_3: { rich_text: rt(block.content) }
			};
		case 'bulleted_list_item':
			return {
				object: 'block',
				type: 'bulleted_list_item',
				bulleted_list_item: { rich_text: rt(block.content) }
			};
		case 'image':
			return {
				object: 'block',
				type: 'image',
				image: { type: 'external', external: { url: block.content } }
			};
		case 'video':
			return {
				object: 'block',
				type: 'video',
				video: { type: 'external', external: { url: block.content } }
			};
		case 'divider':
			return { object: 'block', type: 'divider', divider: {} };
		default:
			return {
				object: 'block',
				type: 'paragraph',
				paragraph: { rich_text: rt(block.content) }
			};
	}
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) throw error(401, 'Not connected to Notion');

	const client = createNotionClient(token);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const page = (await client.pages.retrieve({ page_id: params.id })) as any;
	const props = page.properties;

	const project = {
		id: page.id,
		title: props.Title?.title?.[0]?.text?.content || 'Untitled Project',
		status: props.Status?.select?.name || 'Ideating',
		remixTag: props['Remix Tag']?.select?.name || '',
		journal: props.Journal?.rich_text?.[0]?.text?.content || '',
		isPublic: props.Public?.checkbox || false,
		dateStarted: props['Date Started']?.date?.start || '',
		dateCompleted: props['Date Completed']?.date?.start || ''
	};

	// Linked inspirations
	const inspirationRelation = props.Inspiration?.relation || [];
	const inspirations: { id: string; title: string; imageUrl: string; sourceUrl: string }[] = [];
	for (const rel of inspirationRelation) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ip = (await client.pages.retrieve({ page_id: rel.id })) as any;
		const ip_props = ip.properties;
		inspirations.push({
			id: ip.id,
			title: ip_props.Title?.title?.[0]?.text?.content || 'Untitled',
			imageUrl:
				ip_props.Image?.files?.[0]?.file?.url || ip_props.Image?.files?.[0]?.external?.url || '',
			sourceUrl: ip_props['Source URL']?.url || ''
		});
	}

	// Page content blocks
	const blocksResponse = await client.blocks.children.list({ block_id: params.id });
	const blocks: EditorBlock[] = [];
	for (const block of blocksResponse.results) {
		const eb = blockToEditor(block);
		if (eb) blocks.push(eb);
	}

	return { project, inspirations, blocks };
};

export const actions: Actions = {
	updateMeta: async ({ request, params, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected to Notion');

		const client = createNotionClient(token);
		const formData = await request.formData();

		const title = (formData.get('title') as string) || 'Untitled';
		const status = (formData.get('status') as string) || 'Ideating';
		const remixTag = formData.get('remixTag') as string;
		const isPublic = formData.get('public') === 'on';

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const properties: Record<string, any> = {
			Title: { title: [{ text: { content: title } }] },
			Status: { select: { name: status } },
			Public: { checkbox: isPublic }
		};

		if (remixTag) {
			properties['Remix Tag'] = { select: { name: remixTag } };
		}

		if (status === 'Done') {
			properties['Date Completed'] = {
				date: { start: new Date().toISOString().split('T')[0] }
			};
		}

		await client.pages.update({ page_id: params.id, properties });
		return { metaSaved: true };
	},

	saveContent: async ({ request, params, cookies }) => {
		const token = cookies.get('notion_token');
		if (!token) throw error(401, 'Not connected to Notion');

		const client = createNotionClient(token);
		const formData = await request.formData();
		const blocksJson = formData.get('blocks') as string;

		if (!blocksJson) throw error(400, 'No blocks provided');

		const newBlocks: EditorBlock[] = JSON.parse(blocksJson);

		// Filter out image/video blocks with no URL
		const validBlocks = newBlocks.filter((b) => {
			if ((b.type === 'image' || b.type === 'video') && !b.content.trim()) return false;
			return true;
		});

		// Delete all existing page children
		const existing = await client.blocks.children.list({ block_id: params.id });
		for (const block of existing.results) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.blocks.delete({ block_id: (block as any).id });
			} catch {
				// Already deleted
			}
		}

		// Append new blocks
		if (validBlocks.length > 0) {
			const notionBlocks = validBlocks.map(editorToNotion);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (client.blocks.children.append as any)({
				block_id: params.id,
				children: notionBlocks
			});
		}

		// Also update Journal property with text summary for backward compat
		const textSummary = validBlocks
			.filter((b) => !['divider', 'image', 'video'].includes(b.type))
			.map((b) => b.content)
			.join('\n')
			.slice(0, 1900);

		await client.pages.update({
			page_id: params.id,
			properties: {
				Journal: { rich_text: [{ text: { content: textSummary } }] }
			}
		});

		return { contentSaved: true };
	}
};
