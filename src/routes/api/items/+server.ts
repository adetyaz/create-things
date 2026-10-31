import { error, json, type RequestHandler } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items } from '$lib/server/db/schema';
import { currentUserId } from '$lib/server/user';
import { queueAnalysis } from '$lib/server/analysis/queue';
import type { Palette } from '$lib/colors/palette';

interface CaptureBody {
	captureType?: string;
	sourceUrl?: string;
	note?: string;
	title?: string;
	palette?: Palette;
}

/**
 * POST /api/items: save a capture (Status: Inbox) and queue its analysis.
 * Links and notes for now; screenshots and uploads need R2 storage (Phase 0 #6).
 */
export const POST: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const body = (await event.request.json().catch(() => null)) as CaptureBody | null;
	if (!body) error(400, 'Send a JSON body');

	const captureType = body.captureType;
	if (captureType === 'screenshot' || captureType === 'upload') {
		error(501, 'Image captures need R2 storage, which is not set up yet');
	}
	if (captureType !== 'url' && captureType !== 'note') {
		error(400, 'captureType must be "url" or "note"');
	}

	const sourceUrl = body.sourceUrl?.trim() || null;
	const note = body.note?.trim() || null;
	if (captureType === 'url' && !isHttpUrl(sourceUrl))
		error(400, 'sourceUrl must be an http(s) URL');
	if (captureType === 'note' && !note) error(400, 'note is required for a note capture');

	const givenTitle = body.title?.trim();
	const title = givenTitle || (sourceUrl ? new URL(sourceUrl).hostname : note!.slice(0, 60));
	const platformName = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : null;

	const [item] = await withDb(event.platform, (db) =>
		db
			.insert(items)
			.values({
				userId,
				title,
				titleFromUser: !!givenTitle,
				captureType,
				sourceUrl,
				note,
				platform: platformName
			})
			.returning()
	);

	const analysis = await queueAnalysis(event.platform, {
		itemId: item.id,
		palette: body.palette ?? null
	});

	return json({ item, analysis }, { status: 201 });
};

/** GET /api/items: the current user's items, newest first. */
export const GET: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	const rows = await withDb(event.platform, (db) =>
		db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.savedAt)).limit(100)
	);
	return json({ items: rows });
};

function isHttpUrl(value: string | null): value is string {
	if (!value) return false;
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}
