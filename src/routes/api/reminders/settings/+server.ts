import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { reminderSettingsInput } from '$lib/server/features/reminders/input';
import { setReminderSettings } from '$lib/server/features/reminders/service';

/** PUT /api/reminders/settings { perDay?, anchorTimes? }: reminders a day; usual anchor times. */
export const PUT: RequestHandler = async (event) => {
	const input = validate(reminderSettingsInput, await event.request.json().catch(() => ({})));
	return json(await setReminderSettings(event.platform, currentUserId(event), input));
};
