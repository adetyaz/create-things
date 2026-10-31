import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { getDay } from '$lib/server/features/plan/day';

/** GET /api/plan/day?date=YYYY-MM-DD (default today): the day's blocks in rank order, and #1. */
export const GET: RequestHandler = async (event) => {
	const date = event.url.searchParams.get('date');
	const day = date ? validate(z.iso.date(), date) : undefined;
	return json(await getDay(event.platform, currentUserId(event), day));
};
