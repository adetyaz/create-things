/**
 * GET /api/portfolio?username=xxx
 *
 * Public endpoint — reads published data from Notion for a user's portfolio.
 * No auth required. Looks up the user by username in the User Profile DB,
 * then fetches their published projects, public journal entries, milestones, etc.
 */
import { json, error } from '@sveltejs/kit';
import { NOTION_CLIENT_SECRET } from '$env/static/private';
import { Client } from '@notionhq/client';
import type { RequestHandler } from './$types.js';

/**
 * For portfolio we need a service-level Notion client that can read
 * public data. In production this would use an internal integration token.
 * For now, we accept the token via query param or use the stored one.
 */
function getServiceClient(token?: string): Client {
	return new Client({ auth: token || NOTION_CLIENT_SECRET });
}

export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username');
	if (!username) throw error(400, 'Missing username parameter');

	// We need database IDs — in production these would be stored server-side
	// For now, accept them as query params or use a lookup
	const dbIdsParam = url.searchParams.get('dbIds');
	const token = url.searchParams.get('token');

	if (!dbIdsParam || !token) {
		throw error(400, 'Missing required parameters for portfolio lookup');
	}

	const dbIds = JSON.parse(dbIdsParam);
	const client = getServiceClient(token);

	// Step 1: Find user by username
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const userResponse = await (client.dataSources as any).query({
		data_source_id: dbIds.userProfile,
		filter: {
			property: 'Username',
			title: { equals: username }
		},
		page_size: 1
	});

	if (!userResponse.results.length) {
		throw error(404, 'User not found');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const userProps = (userResponse.results[0] as any).properties;
	const isPublic = userProps['Portfolio Public']?.checkbox === true;

	if (!isPublic) {
		throw error(403, 'This portfolio is private');
	}

	const profile = {
		username: userProps.Username?.title?.[0]?.text?.content || username,
		bio: userProps.Bio?.rich_text?.[0]?.text?.content || '',
		creativeDna: userProps['Creative DNA']?.rich_text?.[0]?.text?.content || ''
	};

	// Step 2: Fetch published projects (status = Done, public = true)
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
	const projects = projectsResponse.results.map((page: any) => {
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
				'',
			inspirationIds: p.Inspiration?.relation?.map((r: { id: string }) => r.id) || []
		};
	});

	// Step 3: Fetch completed roadmap milestones
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const roadmapsResponse = await (client.dataSources as any).query({
		data_source_id: dbIds.roadmaps,
		filter: {
			property: 'Progress',
			select: { equals: 'Complete' }
		}
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const completedMilestones = roadmapsResponse.results.map((page: any) => {
		const p = page.properties;
		return {
			id: page.id,
			title: p.Title?.title?.[0]?.text?.content || 'Untitled'
		};
	});

	// Step 4: Fetch ready inspirations for the "Inspiration" section
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspirationsResponse = await (client.dataSources as any).query({
		data_source_id: dbIds.inspirationVault,
		filter: {
			property: 'Status',
			select: { equals: 'Ready' }
		},
		sorts: [{ property: 'Date Saved', direction: 'descending' }],
		page_size: 20
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspirations = inspirationsResponse.results.map((page: any) => {
		const p = page.properties;
		return {
			id: page.id,
			title: p.Title?.title?.[0]?.text?.content || 'Untitled',
			imageUrl: p.Image?.files?.[0]?.file?.url || p.Image?.files?.[0]?.external?.url || '',
			sourceUrl: p['Source URL']?.url || '',
			captureType: p['Capture Type']?.select?.name || ''
		};
	});

	return json({
		profile,
		projects,
		completedMilestones,
		inspirations
	});
};
