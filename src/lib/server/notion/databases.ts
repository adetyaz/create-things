import type { Client } from '@notionhq/client';

/** Database ID map stored after setup. */
export interface DatabaseIds {
	inspirationVault: string;
	analysisResults: string;
	roadmaps: string;
	projects: string;
	publishQueue: string;
	userProfile: string;
}

function selectOptions(names: string[]) {
	return { options: names.map((name: string) => ({ name })) };
}

/** Returns all 6 database creation configs. Parent is injected at call time. */
export function getDbSchemas() {
	return [
		{
			name: 'Inspiration Vault',
			key: 'inspirationVault' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				'Source URL': { url: {} },
				Author: { rich_text: {} },
				Platform: {
					select: selectOptions(['Dribbble', 'Twitter', 'Website', 'Instagram', 'Other'])
				},
				'Capture Type': { select: selectOptions(['screenshot', 'url', 'upload', 'note']) },
				Status: { select: selectOptions(['Pending', 'Ready', 'Active', 'Stale', 'Archived']) },
				'Date Saved': { date: {} },
				'Last Active': { date: {} },
				Notes: { rich_text: {} }
			}
		},
		{
			name: 'Analysis Results',
			key: 'analysisResults' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				Colors: { rich_text: {} },
				Typography: { rich_text: {} },
				Layout: { rich_text: {} },
				Mood: {
					multi_select: selectOptions([
						'minimal',
						'bold',
						'editorial',
						'playful',
						'dark',
						'elegant',
						'retro',
						'futuristic'
					])
				},
				Style: { rich_text: {} },
				Components: { rich_text: {} },
				Attribution: { rich_text: {} },
				'For Developers': { rich_text: {} },
				'For Creators': { rich_text: {} },
				'Roadmap Suggestions': { rich_text: {} }
			}
		},
		{
			name: 'Roadmaps & Learning',
			key: 'roadmaps' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				Skills: { rich_text: {} },
				Milestones: { rich_text: {} },
				Resources: { rich_text: {} },
				Progress: { select: selectOptions(['Not started', 'In progress', 'Complete']) },
				'Completed Skills': { multi_select: selectOptions([]) }
			}
		},
		{
			name: 'Projects',
			key: 'projects' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				Status: { select: selectOptions(['Ideating', 'In Progress', 'Done']) },
				'Remix Tag': { select: selectOptions(['Inspired by', 'Remixed from', 'Recreated']) },
				Journal: { rich_text: {} },
				'Date Started': { date: {} },
				'Date Completed': { date: {} },
				Public: { checkbox: {} }
			}
		},
		{
			name: 'Publish Queue',
			key: 'publishQueue' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				Status: { select: selectOptions(['Draft', 'Approved', 'Published']) },
				'Caption Twitter': { rich_text: {} },
				'Caption LinkedIn': { rich_text: {} },
				'Caption Instagram': { rich_text: {} },
				'Caption Reddit': { rich_text: {} },
				'Credit Line': { rich_text: {} },
				Hashtags: { rich_text: {} },
				Platforms: { multi_select: selectOptions(['Twitter', 'LinkedIn', 'Instagram', 'Reddit']) },
				Scheduled: { date: {} },
				'Published At': { date: {} }
			}
		},
		{
			name: 'User Profile',
			key: 'userProfile' as keyof DatabaseIds,
			properties: {
				Username: { title: {} },
				'Stale Threshold': { number: { format: 'number' } },
				Platforms: {
					multi_select: selectOptions(['Twitter', 'LinkedIn', 'Instagram', 'Reddit', 'Buffer'])
				},
				'Figma Connected': { checkbox: {} },
				'Portfolio Public': { checkbox: {} },
				'Creative DNA': { rich_text: {} },
				Bio: { rich_text: {} }
			}
		}
	];
}

/**
 * Adds relation properties between databases after they are all created.
 * Notion requires database IDs to exist before creating relation properties.
 *
 * The Notion SDK types for databases.update don't expose `properties` in the TS type,
 * but the REST API fully supports it. Type assertion used accordingly.
 */
export async function linkDatabases(client: Client, ids: DatabaseIds): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const update = client.databases.update.bind(client.databases) as (args: any) => Promise<any>;
	await update({
		database_id: ids.inspirationVault,
		properties: {
			Analysis: { relation: { database_id: ids.analysisResults, single_property: {} } },
			Projects: { relation: { database_id: ids.projects, single_property: {} } },
			Roadmap: { relation: { database_id: ids.roadmaps, single_property: {} } }
		}
	});

	await update({
		database_id: ids.analysisResults,
		properties: {
			Inspiration: { relation: { database_id: ids.inspirationVault, single_property: {} } }
		}
	});

	await update({
		database_id: ids.roadmaps,
		properties: {
			Inspiration: { relation: { database_id: ids.inspirationVault, single_property: {} } }
		}
	});

	await update({
		database_id: ids.projects,
		properties: {
			Inspiration: { relation: { database_id: ids.inspirationVault, single_property: {} } },
			'Publish Queue': { relation: { database_id: ids.publishQueue, single_property: {} } }
		}
	});

	await update({
		database_id: ids.publishQueue,
		properties: {
			Project: { relation: { database_id: ids.projects, single_property: {} } }
		}
	});
}
