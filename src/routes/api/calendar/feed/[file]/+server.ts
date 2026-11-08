import { error, type RequestHandler } from '@sveltejs/kit';
import { feedFor } from '$lib/server/features/calendar/service';

/** GET /api/calendar/feed/<token>.ics: the user's blocks as a calendar (the token is the key). */
export const GET: RequestHandler = async (event) => {
	const token = event.params.file?.replace(/\.ics$/, '') ?? '';
	const feed = await feedFor(event.platform, token);
	if (!feed) error(404, 'No calendar at this link');
	return new Response(feed, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'cache-control': 'private, max-age=900'
		}
	});
};
