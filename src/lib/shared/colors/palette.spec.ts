import { describe, expect, it } from 'vitest';
import { formatPalette, paletteFromRgba } from './palette';

function solidBlocks(blocks: Array<{ rgb: [number, number, number]; pixels: number }>) {
	const total = blocks.reduce((n, b) => n + b.pixels, 0);
	const data = new Uint8Array(total * 4);
	let p = 0;
	for (const { rgb, pixels } of blocks) {
		for (let i = 0; i < pixels; i++, p++) data.set([...rgb, 255], p * 4);
	}
	return data;
}

describe('paletteFromRgba', () => {
	it('finds each color and its share, most common first', () => {
		const palette = paletteFromRgba(
			solidBlocks([
				{ rgb: [255, 0, 0], pixels: 3000 },
				{ rgb: [0, 0, 255], pixels: 1000 }
			])
		);

		expect(palette.colors.map((c) => c.hex)).toEqual(['#ff0000', '#0000ff']);
		expect(palette.colors[0].share).toBeCloseTo(0.75, 2);
		expect(palette.colors[1].share).toBeCloseTo(0.25, 2);
		expect(palette.accent).not.toBeNull();
	});

	it('ignores transparent pixels', () => {
		const data = solidBlocks([{ rgb: [0, 128, 0], pixels: 500 }]);
		const transparent = new Uint8Array(500 * 4); // all zeros, alpha 0
		const palette = paletteFromRgba(Uint8Array.from([...data, ...transparent]));

		expect(palette.colors).toHaveLength(1);
		expect(palette.colors[0].share).toBe(1);
	});

	it('returns an empty palette for a fully transparent image', () => {
		expect(paletteFromRgba(new Uint8Array(400))).toEqual({ colors: [], accent: null });
	});

	it('formats a palette for prompts', () => {
		const text = formatPalette({
			colors: [
				{ hex: '#1b1b1b', share: 0.42 },
				{ hex: '#ff5a1f', share: 0.18 }
			],
			accent: '#ff5a1f'
		});
		expect(text).toBe('#1b1b1b 42%, #ff5a1f 18% (accent #ff5a1f)');
	});
});
