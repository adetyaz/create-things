import { error } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import type { PageServerLoad } from './$types.js';

/**
 * Portfolio page — public, no auth required for viewing.
 * We need a Notion token to query data. In production, this would use
 * a service integration token. For now, we attempt to find the user's
 * data via a lookup approach.
 */
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
			const userResponse = await (client.databases as any).query({
				database_id: dbIds.userProfile,
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
	let projects: any[] = [];
	if (dbIds.projects) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const projectsResponse = await (client.databases as any).query({
			database_id: dbIds.projects,
			filter: {
				and: [
					{ property: 'Status', select: { equals: 'Done' } },
					{ property: 'Public', checkbox: { equals: true } }
				]
			},
			sorts: [{ property: 'Date Completed', direction: 'descending' }]
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		projects = projectsResponse.results.map((page: any) => {
			const p = page.properties;
			return {
				id: page.id,
				title: p.Title?.title?.[0]?.text?.content || 'Untitled',
				remixTag: p['Remix Tag']?.select?.name || '',
				journal: p.Journal?.rich_text?.[0]?.text?.content || '',
				dateCompleted: p['Date Completed']?.date?.start || '',
				finalOutput:
					p['Final Output']?.files?.[0]?.file?.url ||
					p['Final Output']?.files?.[0]?.external?.url ||
					''
			};
		});
	}

	// Fetch completed milestones
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let completedMilestones: any[] = [];
	if (dbIds.roadmaps) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const roadmapsResponse = await (client.databases as any).query({
			database_id: dbIds.roadmaps,
			filter: { property: 'Progress', select: { equals: 'Complete' } }
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		completedMilestones = roadmapsResponse.results.map((page: any) => {
			const p = page.properties;
			return {
				id: page.id,
				title: p.Title?.title?.[0]?.text?.content || 'Untitled',
				completedSkills:
					p['Completed Skills']?.multi_select?.map((s: { name: string }) => s.name) || []
			};
		});
	}

	// Fetch inspirations (Ready status, most recent)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let inspirations: any[] = [];
	if (dbIds.inspirationVault) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inspResponse = await (client.databases as any).query({
			database_id: dbIds.inspirationVault,
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
