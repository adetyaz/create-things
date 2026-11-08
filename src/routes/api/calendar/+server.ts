import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { icsInput } from '$lib/server/features/calendar/input';
import { calendarStatus, setIcsUrl } from '$lib/server/features/calendar/service';

/** GET /api/calendar: ICS link connected? last read, busy times this week, your feed link. */
export const GET: RequestHandler = async (event) => {
	return json(await calendarStatus(event.platform, currentUserId(event), event.url.origin));
};

/** PUT /api/calendar { icsUrl | null }: connect (read straight away) or disconnect a calendar. */
export const PUT: RequestHandler = async (event) => {
	const { icsUrl } = validate(icsInput, await event.request.json().catch(() => ({})));
	const result = await setIcsUrl(event.platform, currentUserId(event), icsUrl);
	if (result.status === 'invalid') error(422, result.message);
	return json(result);
};
