import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { sourceSettingsInput } from '$lib/server/features/sources/input';
import { setConnectionSettings } from '$lib/server/features/sources/service';

/** PUT /api/sources/[source]/settings { writeBack?, shareChannelId? }. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(sourceSettingsInput, await event.request.json().catch(() => ({})));
	const settings = await setConnectionSettings(
		event.platform,
		currentUserId(event),
		event.params.source!,
		input
	);
	if (!settings) error(404, 'Not connected');
	return json({ settings });
};
