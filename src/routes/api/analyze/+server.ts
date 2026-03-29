import { json, type RequestHandler } from '@sveltejs/kit';
import { createNotionClient } from '$lib/server/notion/client.js';
import { writeAnalysisResults, updateInspirationStatus } from '$lib/server/notion/mcp.js';
import { scrapeMetadata } from '$lib/server/scraper/metadata.js';
import { extractColors, formatPalette } from '$lib/server/colors/extract.js';
import { analyzeImage } from '$lib/server/ai/gemini.js';
import { analyzeNote } from '$lib/server/ai/groq.js';
import type { DatabaseIds } from '$lib/server/notion/databases.js';

/**
 * POST /api/analyze
 *
 * In-app trigger for the AI analysis pipeline.
 * Uses the session cookie for auth — no webhook secret required.
 * Body: { inspirationId: string }
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = cookies.get('notion_token');
	if (!token) return json({ error: 'Not connected to Notion' }, { status: 401 });

	const dbIdsRaw = cookies.get('notion_db_ids');
	if (!dbIdsRaw) return json({ error: 'Databases not set up' }, { status: 400 });

	const dbIds: DatabaseIds = JSON.parse(dbIdsRaw);
	const client = createNotionClient(token);

	const { inspirationId, profession, professionDetail } = await request.json();
	if (!inspirationId) return json({ error: 'Missing inspirationId' }, { status: 400 });

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const page = (await client.pages.retrieve({ page_id: inspirationId })) as any;
		const props = page.properties;

		const title = props.Title?.title?.[0]?.text?.content || 'Untitled';
		const captureType: string = props['Capture Type']?.select?.name || 'url';
		const sourceUrl: string = props['Source URL']?.url || '';
		const noteText: string = props.Notes?.rich_text?.[0]?.text?.content || '';
		const imageFile: string =
			props.Image?.files?.[0]?.file?.url || props.Image?.files?.[0]?.external?.url || '';

		if (captureType === 'note') {
			if (!noteText) return json({ error: 'Note has no text content' }, { status: 400 });

			const noteAnalysis = await analyzeNote(noteText, { profession, professionDetail });

			await writeAnalysisResults(client, dbIds, {
				inspirationPageId: inspirationId,
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

		// Image / URL analysis via Gemini
		let imageSource = imageFile;
		let metadata = { title: '', author: '', description: '', image: '', url: sourceUrl };

		if (sourceUrl) {
			try {
				metadata = await scrapeMetadata(sourceUrl);
			} catch {
				// best-effort
			}
		}

		if (!imageSource && metadata.image) imageSource = metadata.image;

		let colorPaletteStr = 'No image available for color extraction';
		if (imageSource) {
			try {
				const palette = await extractColors(imageSource);
				colorPaletteStr = formatPalette(palette);
			} catch {
				colorPaletteStr = 'Color extraction failed';
			}
		}

		const analysis = await analyzeImage({
			imageUrl: imageSource || undefined,
			colorPalette: colorPaletteStr,
			sourceUrl: sourceUrl || undefined,
			userNote: noteText || undefined,
			profession: profession || undefined,
			professionDetail: professionDetail || undefined
		});

		const attribution =
			[
				analysis.attribution !== 'Unknown' ? analysis.attribution : '',
				metadata.author ? `Author: ${metadata.author}` : '',
				sourceUrl ? `Source: ${sourceUrl}` : ''
			]
				.filter(Boolean)
				.join(' | ') || 'Unknown';

		// Prepend identified technique to style for richer roadmap context
		const styleWithTechnique = analysis.technique
			? `${analysis.technique} — ${analysis.style}`
			: analysis.style;

		await writeAnalysisResults(client, dbIds, {
			inspirationPageId: inspirationId,
			title: `Analysis — ${title}`,
			colors: analysis.colors,
			typography: analysis.typography,
			layout: analysis.layout,
			mood: analysis.mood,
			style: styleWithTechnique,
			components: analysis.components,
			attribution,
			forDevelopers: analysis.forDevelopers,
			forCreators: analysis.forCreators,
			roadmapSuggestions: analysis.roadmapSuggestions
		});

		return json({ success: true, type: captureType });
	} catch (err) {
		console.error('Analysis error:', err);
		try {
			await updateInspirationStatus(client, inspirationId, 'Pending');
		} catch {
			// best-effort
		}
		return json({ error: 'Analysis failed', detail: String(err) }, { status: 500 });
	}
};
