import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getDay } from '$lib/server/features/plan/day';
import { clashesFor } from '$lib/server/features/calendar/service';

/**
 * GET /api/plan/day?date=YYYY-MM-DD (default today): the day's blocks in rank order, and #1.
 * `clashes[i]` says when block i lands on a busy time in the user's calendar (null: no clash).
 */
export const GET: RequestHandler = async (event) => {
	const date = event.url.searchParams.get('date');
	const day = date ? validate(z.iso.date(), date) : undefined;
	const userId = currentUserId(event);
	const view = await getDay(event.platform, userId, day);
	const clashes = await clashesFor(
		event.platform,
		userId,
		view.blocks.map((b) => ({ ...b, day: view.day, minutes: b.step.minutes }))
	);
	return json({ ...view, clashes });
};
