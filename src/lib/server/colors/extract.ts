/**
 * Color palette extraction using node-vibrant.
 * Works on image URLs or base64 data URIs.
 */
import { Vibrant } from 'node-vibrant/node';

export interface ColorPalette {
	vibrant: string;
	darkVibrant: string;
	lightVibrant: string;
	muted: string;
	darkMuted: string;
	lightMuted: string;
	all: string[];
}

function swatchToHex(swatch: { hex: string } | null | undefined): string {
	return swatch?.hex ?? '';
}

/** Extract a color palette from an image URL or base64 data URI. */
export async function extractColors(imageSource: string): Promise<ColorPalette> {
	const palette = await Vibrant.from(imageSource).getPalette();

	const vibrant = swatchToHex(palette.Vibrant);
	const darkVibrant = swatchToHex(palette.DarkVibrant);
	const lightVibrant = swatchToHex(palette.LightVibrant);
	const muted = swatchToHex(palette.Muted);
	const darkMuted = swatchToHex(palette.DarkMuted);
	const lightMuted = swatchToHex(palette.LightMuted);

	const all = [vibrant, darkVibrant, lightVibrant, muted, darkMuted, lightMuted].filter(Boolean);

	return { vibrant, darkVibrant, lightVibrant, muted, darkMuted, lightMuted, all };
}

/** Format a palette into a human-readable string for AI prompts and Notion storage. */
export function formatPalette(palette: ColorPalette): string {
	const parts: string[] = [];
	if (palette.vibrant) parts.push(`Vibrant: ${palette.vibrant}`);
	if (palette.darkVibrant) parts.push(`Dark Vibrant: ${palette.darkVibrant}`);
	if (palette.lightVibrant) parts.push(`Light Vibrant: ${palette.lightVibrant}`);
	if (palette.muted) parts.push(`Muted: ${palette.muted}`);
	if (palette.darkMuted) parts.push(`Dark Muted: ${palette.darkMuted}`);
	if (palette.lightMuted) parts.push(`Light Muted: ${palette.lightMuted}`);
	return parts.join(' | ');
}
