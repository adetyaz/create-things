/**
 * The analysis job: metadata + palette + AI breakdown for one captured item, then mark it Ready.
 * Runs from the queue in production and inline under `npm run dev`. Safe to retry.
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items, pendingImages } from '$lib/server/db/schema';
import { scrapeMetadata, type UrlMetadata } from '$lib/server/integrations/scraper/metadata';
import {
	fetchImage,
	formatPalette,
	paletteFromImageBytes,
	type FetchedImage,
	type Palette
} from './colors/extract';
import { generateJson } from '$lib/server/ai';
import {
	OutOfCreditsError,
	refundCredits,
	reserveCredits,
	type Reservation
} from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import { intentOf } from '$lib/server/features/intents/registry';
import { normalizeAnalysis, type AnalysisData } from './normalize';
import { ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, analysisPrompt } from './prompt';

/** Queue message for `createthings-analysis`. */
export interface AnalysisJob {
	itemId: string;
	/** Computed in the browser for screenshots and uploads. */
	palette?: Palette | null;
}

export type AnalysisOutcome =
	| { status: 'done'; itemId: string; model: string; skipped: string[] }
	| { status: 'skipped'; itemId: string; reason: string };

/**
 * Runs the job. On failure the error is saved on the item (so GET /api/items/[id] shows it) and
 * rethrown, so the queue retries it; retrying by hand is POST /api/items/[id]/analyze.
 */
export async function runAnalysis(
	platform: App.Platform | undefined,
	job: AnalysisJob
): Promise<AnalysisOutcome> {
	try {
		return await analyze(platform, job);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		await withDb(platform, (db) =>
			db
				.update(items)
				.set({ analysisError: message.slice(0, 2000) })
				.where(eq(items.id, job.itemId))
		).catch(() => {});
		throw e;
	}
}

async function analyze(
	platform: App.Platform | undefined,
	job: AnalysisJob
): Promise<AnalysisOutcome> {
	const [item] = await withDb(platform, (db) =>
		db.select().from(items).where(eq(items.id, job.itemId))
	);
	if (!item) return { status: 'skipped', itemId: job.itemId, reason: 'item not found' };
	// New captures are Inbox; references are analysed too (their palette and type matter), once.
	if (item.status !== 'inbox' && item.status !== 'reference') {
		return { status: 'skipped', itemId: item.id, reason: `already ${item.status}` };
	}
	const [done] = await withDb(platform, (db) =>
		db.select({ id: analyses.id }).from(analyses).where(eq(analyses.itemId, item.id)).limit(1)
	);
	if (done) return { status: 'skipped', itemId: item.id, reason: 'already analysed' };

	// 1. Page metadata (links only). Failure is fine: the model works from what it has.
	let meta: UrlMetadata | null = null;
	if (item.sourceUrl) {
		meta = await scrapeMetadata(item.sourceUrl).catch(() => null);
	}

	// 2. One image download serves both the palette and the vision model.
	let image: FetchedImage | null = await pendingImage(platform, item.id);
	let palette = job.palette ?? null;
	if (!image && meta?.image) image = await fetchImage(meta.image).catch(() => null);
	if (image && !palette) palette = paletteFromImageBytes(image.bytes);

	// 3. Pay for the AI call from today's free quota or bought credits.
	let charge: Reservation;
	try {
		charge = await reserveCredits(platform, item.userId, 'analysis', {
			ref: `analysis:${item.id}`
		});
	} catch (e) {
		if (!(e instanceof OutOfCreditsError)) throw e;
		await withDb(platform, (db) =>
			db.update(items).set({ analysisError: e.message }).where(eq(items.id, item.id))
		);
		// Not thrown, so the queue doesn't retry: it would fail the same way until credits return.
		return { status: 'skipped', itemId: item.id, reason: 'out of credits' };
	}

	try {
		return await breakdownAndSave(platform, item, meta, image, palette, charge);
	} catch (e) {
		await refundCredits(platform, charge).catch((refundError) =>
			console.error('[analysis] refund failed', charge, refundError)
		);
		throw e;
	}
}

/** Steps 4–5: the AI breakdown, then saving it and marking the item Ready. */
async function breakdownAndSave(
	platform: App.Platform | undefined,
	item: typeof items.$inferSelect,
	meta: UrlMetadata | null,
	image: FetchedImage | null,
	palette: Palette | null,
	charge: Reservation
): Promise<AnalysisOutcome> {
	// 4. AI breakdown, with fallbacks across models.
	const result = await generateJson(platform, {
		system: ANALYSIS_SYSTEM,
		prompt: analysisPrompt({
			captureType: item.captureType,
			title: item.titleFromUser ? item.title : (meta?.title ?? null),
			sourceUrl: item.sourceUrl,
			note: item.note,
			description: meta?.description ?? null,
			author: meta?.author ?? null,
			palette: palette ? formatPalette(palette) : null,
			hasImage: image !== null,
			today: new Date().toISOString().slice(0, 10)
		}),
		schema: ANALYSIS_SCHEMA,
		image: image ?? undefined
	});
	const analysis = normalizeAnalysis(result.data, new Date().toISOString().slice(0, 10));

	// 5. Save the analysis and mark the item Ready, together.
	const title = item.titleFromUser ? item.title : meta?.title || analysis.title || item.title;
	const saved = await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const updated = await tx
				.update(items)
				.set({
					// References stay references; new captures become Ready.
					status: item.status === 'reference' ? 'reference' : 'ready',
					title,
					author: item.author ?? (meta?.author || null),
					size: analysis.size,
					difficulty: analysis.difficulty,
					intent: analysis.intent,
					practiceKind: analysis.practiceKind,
					goal: analysis.goal,
					targetDate: analysis.targetDate,
					analysisError: null,
					lastActiveAt: new Date()
				})
				// Only from its current status, so a duplicate delivery can't analyse an item twice.
				.where(and(eq(items.id, item.id), eq(items.status, item.status)))
				.returning({ id: items.id });
			if (updated.length === 0) return false;

			// The screenshot has done its job (until R2 stores images for good).
			await tx.delete(pendingImages).where(eq(pendingImages.itemId, item.id));
			await tx.insert(analyses).values({
				itemId: item.id,
				summary: analysis.summary,
				technique: analysis.technique,
				colors: { palette, notes: analysis.colors },
				typography: analysis.typography,
				layout: analysis.layout,
				mood: analysis.mood,
				style: analysis.style,
				components: analysis.components,
				forDevelopers: analysis.forDevelopers,
				forCreators: analysis.forCreators,
				brief: analysis.brief,
				skills: analysis.skills,
				attribution: meta?.author || null,
				model: result.model
			});
			return true;
		})
	);

	if (!saved) {
		// A duplicate delivery got here first; don't charge twice for one analysis.
		await refundCredits(platform, charge).catch((refundError) =>
			console.error('[analysis] refund failed', charge, refundError)
		);
		return { status: 'skipped', itemId: item.id, reason: 'already analysed' };
	}

	// The pet remembers what you want to make or learn (a reference isn't a goal, so it's skipped;
	// what references say about your taste goes into the weekly "drawn to" memory instead).
	// A failed save never undoes the analysis.
	if (item.status !== 'reference') {
		await remember(platform, item.userId, {
			type: intentOf(analysis.intent).memoryType,
			summary: goalSummary(title, analysis),
			sourceType: 'item',
			sourceId: item.id
		}).catch((e) => console.error('[analysis] remember failed for', item.id, e));
	}

	return { status: 'done', itemId: item.id, model: result.model, skipped: result.skipped };
}

/** A short memory in our words, e.g. "Learning goal: Blender for 3D characters (about a week, medium)". */
function goalSummary(title: string, analysis: AnalysisData): string {
	const kind = intentOf(analysis.intent).summaryLabel;
	const size = analysis.size
		? `about ${analysis.size === 'afternoon' ? 'an afternoon' : `a ${analysis.size}`}`
		: null;
	const detail = [size, analysis.difficulty].filter(Boolean).join(', ');
	const goal = analysis.goal ? ` Goal: ${analysis.goal}` : '';
	const skills = analysis.skills.length
		? ` Skills: ${analysis.skills.slice(0, 4).join(', ')}.`
		: '';
	return `${kind}: ${title}${detail ? ` (${detail})` : ''}. ${analysis.summary}${goal}${skills}`;
}

/** A screenshot sent with the capture, waiting in Postgres until file storage exists. */
async function pendingImage(
	platform: App.Platform | undefined,
	itemId: string
): Promise<FetchedImage | null> {
	const [row] = await withDb(platform, (db) =>
		db.select().from(pendingImages).where(eq(pendingImages.itemId, itemId))
	);
	return row
		? { mime: row.mime, bytes: Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0)) }
		: null;
}
