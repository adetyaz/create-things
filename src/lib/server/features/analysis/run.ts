/**
 * The analysis job: metadata + palette + AI breakdown for one captured item, then mark it Ready.
 * Runs from the queue in production and inline under `npm run dev`. Safe to retry.
 */
import { and, eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { analyses, items } from '$lib/server/db/schema';
import { scrapeMetadata, type UrlMetadata } from '$lib/server/integrations/scraper/metadata';
import {
	fetchImage,
	formatPalette,
	paletteFromImageBytes,
	type FetchedImage,
	type Palette
} from './colors/extract';
import { generateJson } from '$lib/server/ai';
import { normalizeAnalysis } from './normalize';
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
	if (item.status !== 'inbox') {
		return { status: 'skipped', itemId: item.id, reason: `already ${item.status}` };
	}

	// 1. Page metadata (links only). Failure is fine: the model works from what it has.
	let meta: UrlMetadata | null = null;
	if (item.sourceUrl) {
		meta = await scrapeMetadata(item.sourceUrl).catch(() => null);
	}

	// 2. One image download serves both the palette and the vision model.
	let image: FetchedImage | null = null;
	let palette = job.palette ?? null;
	if (meta?.image) {
		image = await fetchImage(meta.image).catch(() => null);
		if (image && !palette) palette = paletteFromImageBytes(image.bytes);
	}

	// 3. AI breakdown, with fallbacks across models.
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
			hasImage: image !== null
		}),
		schema: ANALYSIS_SCHEMA,
		image: image ?? undefined
	});
	const analysis = normalizeAnalysis(result.data);

	// 4. Save the analysis and mark the item Ready, together.
	const title = item.titleFromUser ? item.title : meta?.title || analysis.title || item.title;
	await withDb(platform, (db) =>
		db.transaction(async (tx) => {
			const updated = await tx
				.update(items)
				.set({
					status: 'ready',
					title,
					author: item.author ?? (meta?.author || null),
					size: analysis.size,
					difficulty: analysis.difficulty,
					isLearningGoal: analysis.isLearningGoal,
					analysisError: null,
					lastActiveAt: new Date()
				})
				// Only from inbox, so a duplicate delivery can't analyse an item twice.
				.where(and(eq(items.id, item.id), eq(items.status, 'inbox')))
				.returning({ id: items.id });
			if (updated.length === 0) return;

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
		})
	);

	return { status: 'done', itemId: item.id, model: result.model, skipped: result.skipped };
}
