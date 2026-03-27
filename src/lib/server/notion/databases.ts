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

function selectOptions(entries: Array<{ name: string; color?: string }>) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { options: entries.map(({ name, color }) => (color ? { name, color } : { name })) } as any;
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
					select: selectOptions([
						{ name: 'Dribbble', color: 'pink' },
						{ name: 'Twitter', color: 'blue' },
						{ name: 'Website', color: 'gray' },
						{ name: 'Instagram', color: 'orange' },
						{ name: 'Other', color: 'default' }
					])
				},
				'Capture Type': {
					select: selectOptions([
						{ name: 'screenshot', color: 'green' },
						{ name: 'url', color: 'blue' },
						{ name: 'upload', color: 'purple' },
						{ name: 'note', color: 'yellow' }
					])
				},
				Status: {
					select: selectOptions([
						{ name: 'Pending', color: 'yellow' },
						{ name: 'Ready', color: 'green' },
						{ name: 'Active', color: 'blue' },
						{ name: 'Stale', color: 'orange' },
						{ name: 'Archived', color: 'gray' }
					])
				},
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
						{ name: 'minimal' },
						{ name: 'bold' },
						{ name: 'editorial' },
						{ name: 'playful' },
						{ name: 'dark' },
						{ name: 'clean' }
					])
				},
				Style: { rich_text: {} },
				Components: { rich_text: {} },
				Attribution: { rich_text: {} },
				'For Developers': { rich_text: {} },
				'For Creators': { rich_text: {} },
				Suggestions: { rich_text: {} }
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
				Progress: {
					select: selectOptions([
						{ name: 'Not started', color: 'gray' },
						{ name: 'In progress', color: 'blue' },
						{ name: 'Complete', color: 'green' }
					])
				}
			}
		},
		{
			name: 'Projects',
			key: 'projects' as keyof DatabaseIds,
			properties: {
				Title: { title: {} },
				Status: {
					select: selectOptions([
						{ name: 'Ideating', color: 'yellow' },
						{ name: 'In Progress', color: 'blue' },
						{ name: 'Done', color: 'green' }
					])
				},
				'Remix Tag': {
					select: selectOptions([
						{ name: 'Inspired by', color: 'green' },
						{ name: 'Remixed from', color: 'yellow' },
						{ name: 'Recreated', color: 'orange' }
					])
				},
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
				Status: {
					select: selectOptions([
						{ name: 'Draft', color: 'gray' },
						{ name: 'Approved', color: 'blue' },
						{ name: 'Published', color: 'green' }
					])
				},
				'Caption Twitter': { rich_text: {} },
				'Caption LinkedIn': { rich_text: {} },
				'Caption Instagram': { rich_text: {} },
				'Caption Reddit': { rich_text: {} },
				'Credit Line': { rich_text: {} },
				Hashtags: { rich_text: {} },
				Platforms: {
					multi_select: selectOptions([
						{ name: 'Twitter' },
						{ name: 'LinkedIn' },
						{ name: 'Instagram' },
						{ name: 'Reddit' }
					])
				},
				'Published At': { date: {} }
			}
		},
		{
			name: 'User Profile',
			key: 'userProfile' as keyof DatabaseIds,
			properties: {
				Username: { title: {} },
				'Stale Threshold': { number: { format: 'number' } },
				'Portfolio Public': { checkbox: {} },
				'Creative DNA': { rich_text: {} },
				Bio: { rich_text: {} },
				'Figma Connected': { checkbox: {} },
				Platforms: {
					multi_select: selectOptions([
						{ name: 'Twitter' },
						{ name: 'LinkedIn' },
						{ name: 'Instagram' },
						{ name: 'Reddit' }
					])
				}
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
	await client.dataSources.update({
		data_source_id: ids.inspirationVault,
		properties: {
			Analysis: { relation: { data_source_id: ids.analysisResults, dual_property: {} } },
			Projects: { relation: { data_source_id: ids.projects, dual_property: {} } },
			Roadmap: { relation: { data_source_id: ids.roadmaps, dual_property: {} } }
		}
	});

	await client.dataSources.update({
		data_source_id: ids.analysisResults,
		properties: {
			Inspiration: { relation: { data_source_id: ids.inspirationVault, dual_property: {} } }
		}
	});

	await client.dataSources.update({
		data_source_id: ids.roadmaps,
		properties: {
			Inspiration: { relation: { data_source_id: ids.inspirationVault, dual_property: {} } }
		}
	});

	await client.dataSources.update({
		data_source_id: ids.projects,
		properties: {
			Inspiration: { relation: { data_source_id: ids.inspirationVault, dual_property: {} } },
			'Publish Queue': { relation: { data_source_id: ids.publishQueue, dual_property: {} } }
		}
	});

	await client.dataSources.update({
		data_source_id: ids.publishQueue,
		properties: {
			Project: { relation: { data_source_id: ids.projects, dual_property: {} } }
		}
	});
}
