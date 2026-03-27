import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad } from './$types.js';

interface PortfolioBlock {
	type: string;
	content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blockToPortfolio(block: any): PortfolioBlock | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const text = (rt: any[]) => rt?.map((t: any) => t.plain_text).join('') || '';
	switch (block.type) {
		case 'paragraph':
			return { type: 'paragraph', content: text(block.paragraph?.rich_text) };
		case 'heading_1':
		case 'heading_2':
			return { type: 'heading_2', content: text(block[block.type]?.rich_text) };
		case 'heading_3':
			return { type: 'heading_3', content: text(block.heading_3?.rich_text) };
		case 'bulleted_list_item':
			return { type: 'bulleted_list_item', content: text(block.bulleted_list_item?.rich_text) };
		case 'image':
			return {
				type: 'image',
				content: block.image?.external?.url || block.image?.file?.url || ''
			};
		case 'video':
			return {
				type: 'video',
				content: block.video?.external?.url || block.video?.file?.url || ''
			};
		case 'divider':
			return { type: 'divider', content: '' };
		default:
			return null;
	}
}
export const load: PageServerLoad = async ({ params, cookies }) => {
	const username = params.username;

	// Try to get token from cookies (works if the portfolio owner is viewing)
	// In production, portfolios would use a service-level token
	const token = cookies.get('notion_token');
	const dbIdsRaw = cookies.get('notion_db_ids');

	if (!token || !dbIdsRaw) {
		// Return a minimal portfolio with a message encouraging the owner to set up
		return {
			username,
			found: false,
			profile: { username, bio: '', creativeDna: '' },
			projects: [],
			completedMilestones: [],
			inspirations: []
		};
	}

	const dbIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	// Find user by username in the User Profile DB
	let profile = { username, bio: '', creativeDna: '' };
	let isPublic = false;

	if (dbIds.userProfile) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const userResponse = await (client.dataSources as any).query({
				data_source_id: dbIds.userProfile,
				filter: {
					property: 'Username',
					title: { equals: username }
				},
				page_size: 1
			});

			if (userResponse.results.length) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const userProps = (userResponse.results[0] as any).properties;
				isPublic = userProps['Portfolio Public']?.checkbox === true;
				profile = {
					username: userProps.Username?.title?.[0]?.text?.content || username,
					bio: userProps.Bio?.rich_text?.[0]?.text?.content || '',
					creativeDna: userProps['Creative DNA']?.rich_text?.[0]?.text?.content || ''
				};
			}
		} catch {
			// User profile DB may not exist
		}
	}

	if (!isPublic) {
		throw error(404, 'Portfolio not found or is private');
	}

	// Fetch published projects (Done + Public)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const projects: any[] = [];
	if (dbIds.projects) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const projectsResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.projects,
			filter: {
				and: [
					{ property: 'Status', select: { equals: 'Done' } },
					{ property: 'Public', checkbox: { equals: true } }
				]
			},
			sorts: [{ property: 'Date Completed', direction: 'descending' }]
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const projectPages = projectsResponse.results.map((page: any) => {
			const p = page.properties;
			return {
				id: page.id,
				title: p.Title?.title?.[0]?.text?.content || 'Untitled',
				remixTag: p['Remix Tag']?.select?.name || '',
				dateCompleted: p['Date Completed']?.date?.start || ''
			};
		});

		// Fetch page blocks for each project (cover image + rich content)
		for (const proj of projectPages) {
			const blocksResponse = await client.blocks.children.list({ block_id: proj.id });
			const blocks: PortfolioBlock[] = [];
			let coverImage = '';
			for (const b of blocksResponse.results) {
				const pb = blockToPortfolio(b);
				if (pb) {
					if (!coverImage && pb.type === 'image' && pb.content) {
						coverImage = pb.content;
					}
					blocks.push(pb);
				}
			}
			projects.push({ ...proj, coverImage, blocks });
		}
	}

	// Fetch completed milestones
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let completedMilestones: any[] = [];
	if (dbIds.roadmaps) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const roadmapsResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.roadmaps,
			filter: { property: 'Progress', select: { equals: 'Complete' } }
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		completedMilestones = roadmapsResponse.results.map((page: any) => {
			const p = page.properties;
			return {
				id: page.id,
				title: p.Title?.title?.[0]?.text?.content || 'Untitled'
			};
		});
	}

	// Fetch inspirations (Ready status, most recent)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let inspirations: any[] = [];
	if (dbIds.inspirationVault) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inspResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.inspirationVault,
			filter: { property: 'Status', select: { equals: 'Ready' } },
			sorts: [{ property: 'Date Saved', direction: 'descending' }],
			page_size: 12
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		inspirations = inspResponse.results.map((page: any) => {
			const p = page.properties;
			return {
				id: page.id,
				title: p.Title?.title?.[0]?.text?.content || 'Untitled',
				imageUrl: p.Image?.files?.[0]?.file?.url || p.Image?.files?.[0]?.external?.url || '',
				captureType: p['Capture Type']?.select?.name || ''
			};
		});
	}

	return {
		username,
		found: true,
		profile,
		projects,
		completedMilestones,
		inspirations
	};
};
