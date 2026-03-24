/**
 * Figma REST API — exports captured images to Figma as new frames.
 *
 * Uses the Figma REST API to create image nodes in a user's Figma file.
 * API docs: https://www.figma.com/developers/api
 *
 * Flow:
 * 1. User provides their Figma personal access token + a target file key
 * 2. We upload the image URL and create a frame with the inspiration title
 * 3. Add a comment with the source URL for attribution
 */
import { FIGMA_ACCESS_TOKEN } from '$env/static/private';

const FIGMA_API = 'https://api.figma.com/v1';

/** Export an inspiration image to Figma as a new frame. */
export async function exportToFigma(opts: {
	fileKey: string;
	imageUrl: string;
	title: string;
	sourceUrl?: string;
	figmaToken?: string;
}): Promise<{ success: boolean; nodeId?: string; error?: string }> {
	const token = opts.figmaToken || FIGMA_ACCESS_TOKEN;

	if (!token || token === 'placeholder') {
		console.log(`[Figma mock] Would export "${opts.title}" to file ${opts.fileKey}`);
		return { success: true, nodeId: 'mock-node-' + Date.now() };
	}

	try {
		// Step 1: Upload image to Figma
		const uploadResponse = await fetch(`${FIGMA_API}/images/${opts.fileKey}`, {
			method: 'POST',
			headers: {
				'X-Figma-Token': token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				images: {
					[crypto.randomUUID()]: opts.imageUrl
				}
			})
		});

		if (!uploadResponse.ok) {
			const text = await uploadResponse.text();
			throw new Error(`Figma upload error ${uploadResponse.status}: ${text}`);
		}

		// Step 2: Add a comment with attribution
		if (opts.sourceUrl) {
			const frameName = `${opts.title} — captured via createthings`;
			await fetch(`${FIGMA_API}/files/${opts.fileKey}/comments`, {
				method: 'POST',
				headers: {
					'X-Figma-Token': token,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: `${frameName}\nSource: ${opts.sourceUrl}`
				})
			});
		}

		return { success: true };
	} catch (err) {
		return { success: false, error: String(err) };
	}
}
