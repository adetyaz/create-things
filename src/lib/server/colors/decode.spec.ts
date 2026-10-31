import { describe, expect, it } from 'vitest';
import jpeg from 'jpeg-js';
import { encode as encodePng } from 'fast-png';
import { decodeImage } from './decode';

const W = 8;
const H = 4;

/** Left half orange, right half teal. */
function rgbaFixture(): Uint8Array {
	const data = new Uint8Array(W * H * 4);
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			data.set(x < W / 2 ? [255, 128, 0, 255] : [0, 128, 128, 255], (y * W + x) * 4);
		}
	}
	return data;
}

describe('decodeImage', () => {
	it('decodes an RGBA PNG exactly', () => {
		const png = encodePng({ width: W, height: H, data: rgbaFixture(), channels: 4, depth: 8 });
		const image = decodeImage(png);

		expect(image).toMatchObject({ width: W, height: H });
		expect(Array.from(image.data)).toEqual(Array.from(rgbaFixture()));
	});

	it('expands a grayscale PNG to RGBA', () => {
		const gray = Uint8Array.from({ length: W * H }, () => 200);
		const image = decodeImage(
			encodePng({ width: W, height: H, data: gray, channels: 1, depth: 8 })
		);

		expect(Array.from(image.data.slice(0, 4))).toEqual([200, 200, 200, 255]);
	});

	it('decodes a JPEG to RGBA, close to the original colors', () => {
		const encoded = jpeg.encode({ width: W, height: H, data: rgbaFixture() }, 95).data;
		const image = decodeImage(new Uint8Array(encoded));

		expect(image).toMatchObject({ width: W, height: H });
		const [r, g, b, a] = image.data.slice(0, 4);
		expect(a).toBe(255);
		expect(r).toBeGreaterThan(200);
		expect(g).toBeGreaterThan(90);
		expect(b).toBeLessThan(60);
	});

	it('rejects formats it cannot decode', () => {
		const gif = new TextEncoder().encode('GIF89a');
		expect(() => decodeImage(gif)).toThrow(/Unsupported image format/);
	});
});
