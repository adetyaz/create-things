/**
 * Accounts that connect with OAuth (Breakdown §2c). Adding one is an entry here plus its client
 * module. Client ids and secrets come from env (needs-input.md K1–K3).
 */

export interface OAuthSource {
	id: 'arena' | 'pinterest' | 'google_calendar';
	label: string;
	authorizeUrl: string;
	tokenUrl: string;
	/** Scopes asked for; write scopes only when a feature needs them. */
	scopes: string[];
	clientIdEnv: string;
	clientSecretEnv: string;
	/** Extra query parameters on the authorize URL. */
	authorizeParams?: Record<string, string>;
	/** What it brings in and sends out, for Settings → Connections. */
	brings: string;
	sends: string;
}

export const SOURCES: OAuthSource[] = [
	{
		id: 'arena',
		label: 'Are.na',
		authorizeUrl: 'https://www.are.na/oauth/authorize',
		tokenUrl: 'https://api.are.na/v3/oauth/token',
		// Write is only used for "share what I made back", which always asks first.
		scopes: ['read', 'write'],
		clientIdEnv: 'ARENA_CLIENT_ID',
		clientSecretEnv: 'ARENA_CLIENT_SECRET',
		brings: 'Channels you choose, as collections; synced daily',
		sends: 'A "made with createthings" block when you finish something, only with your OK'
	},
	{
		id: 'pinterest',
		label: 'Pinterest',
		authorizeUrl: 'https://www.pinterest.com/oauth/',
		tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
		scopes: ['boards:read', 'pins:read'],
		clientIdEnv: 'PINTEREST_CLIENT_ID',
		clientSecretEnv: 'PINTEREST_CLIENT_SECRET',
		brings: 'Boards you choose, as collections; synced daily',
		sends: 'Nothing'
	},
	{
		id: 'google_calendar',
		label: 'Google Calendar',
		authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		scopes: [
			'https://www.googleapis.com/auth/calendar.events',
			'https://www.googleapis.com/auth/calendar.freebusy'
		],
		clientIdEnv: 'GOOGLE_CLIENT_ID',
		clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
		authorizeParams: { access_type: 'offline', prompt: 'consent' },
		brings: 'Busy times, so plans and reminders go around them',
		sends: 'Your planned blocks as events with alerts'
	}
];

export function sourceOf(id: string): OAuthSource | undefined {
	return SOURCES.find((s) => s.id === id);
}
