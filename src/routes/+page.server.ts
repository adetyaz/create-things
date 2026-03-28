import { createNotionClient } from '$lib/server/notion/client.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';
import type { PageServerLoad } from './$types.js';

const DORMANT_QUOTES = [
	'Research on the forgetting curve shows we lose roughly 70% of new information within 24 hours without revisiting it. Your unworked projects are no different.',
	'We mistake saving for doing. A bookmark is not progress. A saved tab is not learning. Only creating moves the needle.',
	'Every unstarted project is a promise you made to yourself. How many promises are you keeping?',
	"The moment you started that project, you had momentum. Momentum doesn't wait.",
	'People save things to "work on later" — and later becomes never. The motivation half-life is about 48 hours.',
	'Ebbinghaus proved it: without active engagement, memory decays fast. Ideas need revisiting before they disappear completely.',
	'Intention without action is just a wish. Your In Progress projects are waiting for you to show up.'
];

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('notion_token');
	const dbIdsRaw = cookies.get('notion_db_ids');
	const testDormant = url.searchParams.get('testDormant') === '1';

	if (!token || !dbIdsRaw) {
		return {
			connected: false,
			inspirations: [],
			staleItems: [],
			dormantProjects: [],
			dormantQuote: ''
		};
	}

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	// Fetch stale threshold and dormant days from user profile
	let staleThreshold = 14;
	let dormantDays = 7;
	if (dbIds.userProfile) {
		try {
			const profileResponse = await client.dataSources.query({
				data_source_id: dbIds.userProfile,
				page_size: 1
			});
			if (profileResponse.results.length) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const props = (profileResponse.results[0] as any).properties;
				const threshold = props['Stale Threshold']?.number;
				if (threshold && threshold > 0) staleThreshold = threshold;
				const dormant = props['Dormant Days']?.number;
				if (dormant && dormant > 0) dormantDays = dormant;
			}
		} catch {
			// Use defaults
		}
	}

	// Query the Inspiration Vault, newest first
	const response = await client.dataSources.query({
		data_source_id: dbIds.inspirationVault,
		sorts: [{ property: 'Date Saved', direction: 'descending' }],
		page_size: 50
	});

	const now = Date.now();
	const thresholdMs = staleThreshold * 24 * 60 * 60 * 1000;

	const stalePageIds: string[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspirations = response.results.map((page: any) => {
		const props = page.properties;
		const status = props.Status?.select?.name || 'Pending';
		const dateSaved = props['Date Saved']?.date?.start || '';
		const lastActive = props['Last Active']?.date?.start || '';

		// Check if this item should become stale
		const referenceDate = lastActive || dateSaved;
		let isStale = false;
		if (referenceDate && (status === 'Ready' || status === 'Active')) {
			const age = now - new Date(referenceDate).getTime();
			if (age > thresholdMs) {
				isStale = true;
				stalePageIds.push(page.id);
			}
		}

		return {
			id: page.id,
			title: props.Title?.title?.[0]?.text?.content || 'Untitled',
			captureType: props['Capture Type']?.select?.name || 'url',
			status: isStale ? 'Stale' : status,
			sourceUrl: props['Source URL']?.url || '',
			dateSaved,
			note: props.Notes?.rich_text?.[0]?.text?.content || '',
			imageUrl: props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || ''
		};
	});

	// Mark stale items in Notion (fire-and-forget)
	for (const pageId of stalePageIds) {
		client.pages
			.update({
				page_id: pageId,
				properties: { Status: { select: { name: 'Stale' } } }
			})
			.catch(() => {});
	}

	const staleItems = inspirations.filter((i: { status: string }) => i.status === 'Stale');

	// Detect dormant projects (In Progress, not edited in N days)

	let dormantProjects: { id: string; title: string; daysSince: number }[] = [];
	if (dbIds.projects) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const projResponse = await (client.dataSources as any).query({
				data_source_id: dbIds.projects,
				filter: { property: 'Status', select: { equals: 'In Progress' } }
			});
			const dormantMs = testDormant ? 0 : dormantDays * 24 * 60 * 60 * 1000;

			dormantProjects = projResponse.results
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.filter((p: any) => {
					const lastEdited = new Date(p.last_edited_time).getTime();
					return now - lastEdited > dormantMs;
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.map((p: any) => ({
					id: p.id,
					title: p.properties.Title?.title?.[0]?.text?.content || 'Untitled',
					daysSince: Math.floor(
						(now - new Date(p.last_edited_time).getTime()) / (24 * 60 * 60 * 1000)
					)
				}));
		} catch {
			// Projects DB may not exist yet
		}
	}

	const dormantQuote =
		dormantProjects.length > 0 ? DORMANT_QUOTES[new Date().getDay() % DORMANT_QUOTES.length] : '';

	return { connected: true, inspirations, staleItems, dormantProjects, dormantQuote };
};
