/**
 * Color palette for an image URL (link captures, og:images). Screenshots and uploads get
 * their palette in the browser instead, from canvas pixels, using the same `paletteFromRgba`.
 */
import { paletteFromRgba, type Palette } from '$lib/colors/palette';
import { decodeImage } from './decode';

export { formatPalette, type Palette } from '$lib/colors/palette';

const MAX_BYTES = 8 * 1024 * 1024;

export interface FetchedImage {
	bytes: Uint8Array;
	/** From the response header, e.g. image/png. */
	mime: string;
}

/** Downloads an image with a size cap and timeout. */
export async function fetchImage(imageUrl: string): Promise<FetchedImage> {
	const res = await fetch(imageUrl, {
		headers: { accept: 'image/png,image/jpeg;q=0.9,image/*;q=0.5' },
		signal: AbortSignal.timeout(10_000)
	});
	if (!res.ok) throw new Error(`Image request failed with HTTP ${res.status}`);

	const length = Number(res.headers.get('content-length') ?? 0);
	if (length > MAX_BYTES) throw new Error('Image is too large');

	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.byteLength > MAX_BYTES) throw new Error('Image is too large');

	const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim();
	return { bytes, mime };
}

/** Palette from downloaded bytes, or null for formats the server can't decode (e.g. WebP). */
export function paletteFromImageBytes(bytes: Uint8Array): Palette | null {
	try {
		return paletteFromRgba(decodeImage(bytes).data);
	} catch {
		return null;
	}
}

/** Fetches a JPEG or PNG and builds its palette. Null for other formats; the vision model covers those. */
export async function extractColors(imageUrl: string): Promise<Palette | null> {
	return paletteFromImageBytes((await fetchImage(imageUrl)).bytes);
}
