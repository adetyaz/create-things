import { requiredEnv } from '$lib/server/platform/env';
import { Client } from '@notionhq/client';

/**
 * Creates an authenticated Notion client for a given access token.
 */
export function createNotionClient(accessToken: string): Client {
	return new Client({ auth: accessToken });
}

/**
 * Builds the Notion OAuth authorization URL.
 */
export function getNotionAuthUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: requiredEnv('NOTION_CLIENT_ID'),
		redirect_uri: requiredEnv('NOTION_REDIRECT_URI'),
		response_type: 'code',
		owner: 'user',
		state
	});
	return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

/**
 * Exchanges an OAuth authorization code for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<{
	access_token: string;
	workspace_id: string;
	workspace_name: string | null;
	bot_id: string;
	owner: Record<string, unknown>;
}> {
	const credentials = btoa(
		`${requiredEnv('NOTION_CLIENT_ID')}:${requiredEnv('NOTION_CLIENT_SECRET')}`
	);

	const response = await fetch('https://api.notion.com/v1/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${credentials}`
		},
		body: JSON.stringify({
			grant_type: 'authorization_code',
			code,
			redirect_uri: requiredEnv('NOTION_REDIRECT_URI')
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Notion OAuth token exchange failed: ${error}`);
	}

	return response.json();
}
