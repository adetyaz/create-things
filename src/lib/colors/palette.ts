/**
 * Color palette from raw pixels, using Material Color Utilities (the quantizer behind Material You).
 * Shared by the server (decoded link images) and the browser (canvas pixels from captures).
 */
import {
	QuantizerCelebi,
	Score,
	argbFromRgb,
	hexFromArgb
} from '@material/material-color-utilities';

export interface PaletteColor {
	hex: string;
	/** Share of the sampled pixels, 0–1. */
	share: number;
}

export interface Palette {
	/** Most common first. Includes neutrals, since they matter for describing a design. */
	colors: PaletteColor[];
	/** The color Material would pick as the accent (vivid, well represented), if any. */
	accent: string | null;
}

/** About 16k pixels is plenty for a palette and keeps big images fast. */
const SAMPLE_TARGET = 16_384;

/** Builds a palette from RGBA bytes (4 per pixel, row-major), e.g. canvas `ImageData.data`. */
export function paletteFromRgba(rgba: ArrayLike<number>, maxColors = 6): Palette {
	const pixelCount = Math.floor(rgba.length / 4);
	const step = Math.max(1, Math.floor(pixelCount / SAMPLE_TARGET));
	const pixels: number[] = [];

	for (let p = 0; p < pixelCount; p += step) {
		const i = p * 4;
		if (rgba[i + 3] < 128) continue; // skip mostly-transparent pixels
		pixels.push(argbFromRgb(rgba[i], rgba[i + 1], rgba[i + 2]));
	}
	if (pixels.length === 0) return { colors: [], accent: null };

	const population = QuantizerCelebi.quantize(pixels, maxColors);
	const total = [...population.values()].reduce((sum, n) => sum + n, 0);
	const colors = [...population.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxColors)
		.map(([argb, count]) => ({ hex: hexFromArgb(argb), share: round(count / total) }));

	const [accent] = Score.score(population, { desired: 1, filter: true });
	return { colors, accent: accent === undefined ? null : hexFromArgb(accent) };
}

/** One line for AI prompts, e.g. "#1b1b1b 42%, #ff5a1f 18% (accent #ff5a1f)". */
export function formatPalette(palette: Palette): string {
	if (palette.colors.length === 0) return 'no colors found';
	const list = palette.colors.map((c) => `${c.hex} ${Math.round(c.share * 100)}%`).join(', ');
	return palette.accent ? `${list} (accent ${palette.accent})` : list;
}

function round(n: number) {
	return Math.round(n * 1000) / 1000;
}
