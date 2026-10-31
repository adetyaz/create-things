/**
 * JPEG and PNG decoding in pure JavaScript, so it runs on Workers (no WebAssembly, no Node zlib).
 * Output is always 8-bit RGBA.
 */
import jpeg from 'jpeg-js';
import { convertIndexedToRgb, decode as decodePng, hasPngSignature } from 'fast-png';

export interface RgbaImage {
	width: number;
	height: number;
	data: Uint8Array;
}

/** Large enough for preview and og:images; refuses anything that would blow the Worker's memory. */
const MAX_PIXELS = 4096 * 4096;

export function isJpeg(bytes: Uint8Array) {
	return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function decodeImage(bytes: Uint8Array): RgbaImage {
	if (hasPngSignature(bytes)) return decodePngToRgba(bytes);
	if (isJpeg(bytes)) {
		const image = jpeg.decode(bytes, {
			useTArray: true,
			formatAsRGBA: true,
			maxResolutionInMP: MAX_PIXELS / 1_000_000
		});
		return { width: image.width, height: image.height, data: image.data };
	}
	throw new Error('Unsupported image format (only JPEG and PNG are decoded on the server)');
}

function decodePngToRgba(bytes: Uint8Array): RgbaImage {
	const png = decodePng(bytes);
	const { width, height } = png;
	if (width * height > MAX_PIXELS) throw new Error('Image is too large to decode');

	const count = width * height;
	const out = new Uint8Array(count * 4);

	if (png.palette) {
		const rgb = convertIndexedToRgb(png);
		const channels = rgb.length / count;
		for (let p = 0; p < count; p++) {
			out[p * 4] = rgb[p * channels];
			out[p * 4 + 1] = rgb[p * channels + 1];
			out[p * 4 + 2] = rgb[p * channels + 2];
			out[p * 4 + 3] = channels === 4 ? rgb[p * channels + 3] : 255;
		}
		return { width, height, data: out };
	}

	// Scale samples of any bit depth (1–16) to 0–255.
	const max = 2 ** png.depth - 1;
	const scale = (v: number) => (png.depth === 8 ? v : Math.round((v * 255) / max));
	const c = png.channels;
	const src = png.data;

	for (let p = 0; p < count; p++) {
		const i = p * c;
		const gray = c <= 2;
		out[p * 4] = scale(src[i]);
		out[p * 4 + 1] = scale(gray ? src[i] : src[i + 1]);
		out[p * 4 + 2] = scale(gray ? src[i] : src[i + 2]);
		out[p * 4 + 3] = c === 2 ? scale(src[i + 1]) : c === 4 ? scale(src[i + 3]) : 255;
	}
	return { width, height, data: out };
}
