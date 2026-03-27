import type { Client } from '@notionhq/client';
import type { DatabaseIds } from './databases.js';

/**
 * Notion MCP integration — read/write via the agent layer.
 *
 * This module wraps Notion API calls that act as the "MCP write-back" points:
 * - Writing analysis results back to Notion
 * - Creating roadmap pages
 * - Writing publish queue captions
 * - Updating entry statuses
 *
 * For now these use the standard Notion SDK. When Notion MCP server-side
 * tooling is integrated, these functions become the adapter layer.
 */

/** Rich text helper — Notion API requires this nested structure for text. */
function richText(content: string) {
	return [{ text: { content } }];
}

/** Write analysis results back to the Analysis Results database. */
export async function writeAnalysisResults(
	client: Client,
	dbIds: DatabaseIds,
	data: {
		inspirationPageId: string;
		title: string;
		colors: string;
		typography: string;
		layout: string;
		mood: string[];
		style: string;
		components: string;
		attribution: string;
		forDevelopers: string;
		forCreators: string;
		roadmapSuggestions: string;
	}
) {
	const page = await client.pages.create({
		parent: { data_source_id: dbIds.analysisResults },
		properties: {
			Title: { title: richText(data.title) },
			Colors: { rich_text: richText(data.colors) },
			Typography: { rich_text: richText(data.typography) },
			Layout: { rich_text: richText(data.layout) },
			Mood: { multi_select: data.mood.map((name) => ({ name })) },
			Style: { rich_text: richText(data.style) },
			Components: { rich_text: richText(data.components) },
			Attribution: { rich_text: richText(data.attribution) },
			'For Developers': { rich_text: richText(data.forDevelopers) },
			'For Creators': { rich_text: richText(data.forCreators) },
			Suggestions: { rich_text: richText(data.roadmapSuggestions) },
			Inspiration: { relation: [{ id: data.inspirationPageId }] }
		}
	});

	// Link back: update the inspiration entry to point to this analysis
	await client.pages.update({
		page_id: data.inspirationPageId,
		properties: {
			Analysis: { relation: [{ id: page.id }] },
			Status: { select: { name: 'Ready' } }
		}
	});

	return page;
}

/** Update the status of an Inspiration Vault entry. */
export async function updateInspirationStatus(
	client: Client,
	pageId: string,
	status: 'Pending' | 'Ready' | 'Active' | 'Stale' | 'Archived'
) {
	return client.pages.update({
		page_id: pageId,
		properties: {
			Status: { select: { name: status } }
		}
	});
}

/** Create a roadmap page in the Roadmaps database linked to an inspiration. */
export async function createRoadmap(
	client: Client,
	dbIds: DatabaseIds,
	data: {
		inspirationPageId: string;
		title: string;
		skills: string;
		milestones: string;
		resources: string;
	}
) {
	const page = await client.pages.create({
		parent: { data_source_id: dbIds.roadmaps },
		properties: {
			Title: { title: richText(data.title) },
			Skills: { rich_text: richText(data.skills) },
			Milestones: { rich_text: richText(data.milestones) },
			Resources: { rich_text: richText(data.resources) },
			Progress: { select: { name: 'Not started' } },
			Inspiration: { relation: [{ id: data.inspirationPageId }] }
		}
	});

	// Link back on the inspiration entry
	await client.pages.update({
		page_id: data.inspirationPageId,
		properties: {
			Roadmap: { relation: [{ id: page.id }] }
		}
	});

	return page;
}

/** Write draft captions to a Publish Queue entry. */
export async function writePublishDrafts(
	client: Client,
	dbIds: DatabaseIds,
	data: {
		projectPageId: string;
		title: string;
		captionTwitter: string;
		captionLinkedIn: string;
		captionInstagram: string;
		captionReddit: string;
		creditLine: string;
		hashtags: string;
		platforms: string[];
	}
) {
	return client.pages.create({
		parent: { data_source_id: dbIds.publishQueue },
		properties: {
			Title: { title: richText(data.title) },
			Status: { select: { name: 'Draft' } },
			'Caption Twitter': { rich_text: richText(data.captionTwitter) },
			'Caption LinkedIn': { rich_text: richText(data.captionLinkedIn) },
			'Caption Instagram': { rich_text: richText(data.captionInstagram) },
			'Caption Reddit': { rich_text: richText(data.captionReddit) },
			'Credit Line': { rich_text: richText(data.creditLine) },
			Hashtags: { rich_text: richText(data.hashtags) },
			Platforms: { multi_select: data.platforms.map((name) => ({ name })) },
			Project: { relation: [{ id: data.projectPageId }] }
		}
	});
}

/** Update a Publish Queue entry status. */
export async function updatePublishStatus(
	client: Client,
	pageId: string,
	status: 'Draft' | 'Approved' | 'Published'
) {
	return client.pages.update({
		page_id: pageId,
		properties: {
			Status: { select: { name: status } },
			...(status === 'Published'
				? { 'Published At': { date: { start: new Date().toISOString() } } }
				: {})
		}
	});
}
