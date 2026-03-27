import { json, type RequestHandler } from '@sveltejs/kit';
import { WEBHOOK_SECRET } from '$env/static/private';
import { createNotionClient } from '$lib/server/notion/client.js';

/**
 * POST /api/digest
 * Weekly creative digest — summarizes what was saved, created, published, and learned.
 * Called by Vercel cron (see vercel.json) or Notion scheduled automation.
 * Returns digest data that can be emailed via Resend or displayed in-app.
 */
export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { token, dbIds } = body;

	if (!token || !dbIds) {
		return json({ error: 'Missing token or dbIds' }, { status: 400 });
	}

	const client = createNotionClient(token);
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Inspirations saved this week
	let savedCount = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let recentInspirations: any[] = [];
	if (dbIds.inspirationVault) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inspResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.inspirationVault,
			filter: { property: 'Date Saved', date: { on_or_after: oneWeekAgo } },
			sorts: [{ property: 'Date Saved', direction: 'descending' }]
		});
		savedCount = inspResponse.results.length;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		recentInspirations = inspResponse.results.slice(0, 5).map((p: any) => ({
			title: p.properties.Title?.title?.[0]?.text?.content || 'Untitled',
			status: p.properties.Status?.select?.name || 'Pending'
		}));
	}

	// Projects completed this week
	let completedProjects = 0;
	if (dbIds.projects) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const projResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.projects,
			filter: {
				and: [
					{ property: 'Status', select: { equals: 'Done' } },
					{ property: 'Date Completed', date: { on_or_after: oneWeekAgo } }
				]
			}
		});
		completedProjects = projResponse.results.length;
	}

	// Items published this week
	let publishedCount = 0;
	if (dbIds.publishQueue) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const pubResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.publishQueue,
			filter: {
				and: [
					{ property: 'Status', select: { equals: 'Published' } },
					{ property: 'Published At', date: { on_or_after: oneWeekAgo } }
				]
			}
		});
		publishedCount = pubResponse.results.length;
	}

	// Milestones completed this week (roadmaps marked Complete)
	let milestonesCompleted = 0;
	if (dbIds.roadmaps) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const roadResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.roadmaps,
			filter: { property: 'Progress', select: { equals: 'Complete' } }
		});
		milestonesCompleted = roadResponse.results.length;
	}

	// Stale items needing attention
	let staleCount = 0;
	if (dbIds.inspirationVault) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const staleResponse = await (client.dataSources as any).query({
			data_source_id: dbIds.inspirationVault,
			filter: { property: 'Status', select: { equals: 'Stale' } }
		});
		staleCount = staleResponse.results.length;
	}

	const digest = {
		week: oneWeekAgo,
		saved: savedCount,
		recentInspirations,
		completed: completedProjects,
		published: publishedCount,
		milestonesCompleted,
		staleCount,
		summary: buildSummary(
			savedCount,
			completedProjects,
			publishedCount,
			milestonesCompleted,
			staleCount
		)
	};

	return json(digest);
};

function buildSummary(
	saved: number,
	completed: number,
	published: number,
	milestones: number,
	stale: number
): string {
	const lines: string[] = [];

	if (saved > 0) lines.push(`You saved ${saved} new inspiration${saved > 1 ? 's' : ''} this week.`);
	if (completed > 0) lines.push(`You completed ${completed} project${completed > 1 ? 's' : ''}!`);
	if (published > 0)
		lines.push(`${published} piece${published > 1 ? 's' : ''} published to social.`);
	if (milestones > 0)
		lines.push(`${milestones} learning milestone${milestones > 1 ? 's' : ''} achieved.`);
	if (stale > 0)
		lines.push(
			`${stale} inspiration${stale > 1 ? 's' : ''} going stale — time to use or archive them.`
		);

	if (lines.length === 0) {
		lines.push('Quiet week — open the extension and capture something that inspires you!');
	}

	return lines.join(' ');
}
