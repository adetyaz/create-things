import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'must be a #rrggbb color');

/** A palette computed in the browser (screenshots and uploads), same shape as `Palette`. */
const palette = z.object({
	colors: z.array(z.object({ hex, share: z.number().min(0).max(1) })).max(12),
	accent: hex.nullable()
});

const common = {
	title: z.string().trim().min(1).max(200).optional(),
	palette: palette.optional()
};

const httpUrl = z.url().refine((value) => /^https?:\/\//i.test(value), 'must be an http(s) URL');

/** Body of POST /api/items. Screenshots and uploads arrive once R2 storage exists (Phase 0 #6). */
export const captureInput = z.discriminatedUnion('captureType', [
	z.object({ captureType: z.literal('url'), sourceUrl: httpUrl, ...common }),
	z.object({
		captureType: z.literal('note'),
		note: z.string().trim().min(1).max(10_000),
		...common
	})
]);

export type CaptureInput = z.infer<typeof captureInput>;

/** Capture types that exist but need storage that isn't set up yet. */
export const IMAGE_CAPTURE_TYPES = ['screenshot', 'upload'] as const;
