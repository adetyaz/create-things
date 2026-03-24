import { json, type RequestHandler } from '@sveltejs/kit';
import { WEBHOOK_SECRET } from '$env/static/private';
import { createNotionClient } from '$lib/server/notion/client.js';
import { writeAnalysisResults, updateInspirationStatus } from '$lib/server/notion/mcp.js';
import { scrapeMetadata } from '$lib/server/scraper/metadata.js';
import { extractColors, formatPalette } from '$lib/server/colors/extract.js';
import { analyzeImage } from '$lib/server/ai/gemini.js';
import { analyzeNote } from '$lib/server/ai/groq.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';

/**
 * POST /api/webhook/notion
 *
 * Receives Notion automation webhooks when a new Inspiration Vault entry is created.
 * Routes by capture type:
 *   - image/url/screenshot/upload → metadata scraping + color extraction + Gemini vision analysis
 *   - note → Groq text analysis
 * Writes results back to Notion via MCP layer.
 */
export const POST: RequestHandler = async ({ request }) => {
	// Verify webhook secret
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { page_id, notion_token, db_ids } = body as {
		page_id: string;
		notion_token: string;
		db_ids: DatabaseIds;
	};

	if (!page_id || !notion_token || !db_ids) {
		return json(
			{ error: 'Missing required fields: page_id, notion_token, db_ids' },
			{ status: 400 }
		);
	}

	const client = createNotionClient(notion_token);

	try {
		// Read the inspiration entry from Notion
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const page = (await client.pages.retrieve({ page_id })) as any;
		const props = page.properties;

		// Extract fields from the Notion page
		const title = props.Title?.title?.[0]?.text?.content || 'Untitled';
		const captureType: string = props['Capture Type']?.select?.name || 'url';
		const sourceUrl: string = props['Source URL']?.url || '';
		const noteText: string = props.Notes?.rich_text?.[0]?.text?.content || '';
		const imageFile: string =
			props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || '';

		if (captureType === 'note') {
			// --- Note analysis via Groq ---
			if (!noteText) {
				return json({ error: 'Note capture has no text content' }, { status: 400 });
			}

			const noteAnalysis = await analyzeNote(noteText);

			await writeAnalysisResults(client, db_ids, {
				inspirationPageId: page_id,
				title: `Analysis — ${title}`,
				colors: '',
				typography: '',
				layout: '',
				mood: noteAnalysis.mood,
				style: noteAnalysis.direction,
				components: '',
				attribution: '',
				forDevelopers: '',
				forCreators: noteAnalysis.brief,
				roadmapSuggestions: noteAnalysis.roadmapSuggestions
			});

			return json({ success: true, type: 'note' });
		}

		// --- Image / URL analysis via Gemini ---
		let imageSource = imageFile;
		let metadata = { title: '', author: '', description: '', image: '', url: sourceUrl };

		// Scrape metadata from source URL if available
		if (sourceUrl) {
			try {
				metadata = await scrapeMetadata(sourceUrl);
			} catch {
				// Metadata scraping is best-effort — continue without it
			}
		}

		// Use scraped og:image as fallback if no direct image
		if (!imageSource && metadata.image) {
			imageSource = metadata.image;
		}

		// Extract colors if we have an image
		let colorPaletteStr = 'No image available for color extraction';
		if (imageSource) {
			try {
				const palette = await extractColors(imageSource);
				colorPaletteStr = formatPalette(palette);
			} catch {
				colorPaletteStr = 'Color extraction failed';
			}
		}

		// Run Gemini vision analysis
		const analysis = await analyzeImage({
			imageUrl: imageSource || undefined,
			colorPalette: colorPaletteStr,
			sourceUrl: sourceUrl || undefined,
			userNote: noteText || undefined
		});

		// Build attribution from analysis + scraped metadata
		const attribution =
			[
				analysis.attribution !== 'Unknown' ? analysis.attribution : '',
				metadata.author ? `Author: ${metadata.author}` : '',
				sourceUrl ? `Source: ${sourceUrl}` : ''
			]
				.filter(Boolean)
				.join(' | ') || 'Unknown';

		await writeAnalysisResults(client, db_ids, {
			inspirationPageId: page_id,
			title: `Analysis — ${title}`,
			colors: analysis.colors,
			typography: analysis.typography,
			layout: analysis.layout,
			mood: analysis.mood,
			style: analysis.style,
			components: analysis.components,
			attribution,
			forDevelopers: analysis.forDevelopers,
			forCreators: analysis.forCreators,
			roadmapSuggestions: analysis.roadmapSuggestions
		});

		return json({ success: true, type: captureType });
	} catch (err) {
		console.error('Webhook processing error:', err);

		// Try to mark entry as failed so it doesn't stay in Pending forever
		try {
			await updateInspirationStatus(client, page_id, 'Pending');
		} catch {
			// Best effort
		}

		return json({ error: 'Analysis pipeline failed', detail: String(err) }, { status: 500 });
	}
};
