import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'must be a #rrggbb color');

/** A palette computed in the browser (screenshots and uploads), same shape as `Palette`. */
const palette = z.object({
	colors: z.array(z.object({ hex, share: z.number().min(0).max(1) })).max(12),
	accent: hex.nullable()
});

const common = {
	title: z.string().trim().min(1).max(200).optional(),
	palette: palette.optional(),
	/** Keep as a reference (a collection, never a task) instead of something to do. */
	asReference: z.boolean().optional(),
	/** A short note added to any capture ("for the contact page"). */
	note: z.string().trim().max(10_000).optional(),
	/** False: saved without analysis (copies and imports; analysed when used, Breakdown §2d). */
	analyse: z.boolean().optional(),
	/** Its id on the site it came from: saving it again updates instead of duplicating. */
	external: z
		.object({ source: z.enum(['x', 'pinterest', 'arena']), id: z.string().trim().min(1).max(200) })
		.optional(),
	/** The board, folder or channel it belongs to (made if new). */
	collection: z
		.object({
			source: z.enum(['app', 'x', 'pinterest', 'arena']),
			externalId: z.string().trim().max(200).optional(),
			title: z.string().trim().min(1).max(200)
		})
		.optional()
};

/** About 6 MB of image as base64. */
const MAX_IMAGE_BASE64 = 8_000_000;

const httpUrl = z.url().refine((value) => /^https?:\/\//i.test(value), 'must be an http(s) URL');

/** Body of POST /api/items. Screenshots and uploads arrive once R2 storage exists (Phase 0 #6). */
export const captureInput = z.discriminatedUnion('captureType', [
	z.object({ captureType: z.literal('url'), sourceUrl: httpUrl, ...common }),
	z.object({
		captureType: z.literal('note'),
		...common,
		note: z.string().trim().min(1).max(10_000)
	}),
	/** A screenshot from the extension: analysed once; stored when file storage (R2) exists. */
	z.object({
		captureType: z.literal('screenshot'),
		image: z.string().min(1).max(MAX_IMAGE_BASE64),
		mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
		sourceUrl: httpUrl.optional(),
		...common
	})
]);

export type CaptureInput = z.infer<typeof captureInput>;

/** Capture types that still need file storage (R2): uploads. */
export const IMAGE_CAPTURE_TYPES = ['upload'] as const;

/** PUT /api/items/[id]/reference: switch a fresh save between "do this" and "keep as reference". */
export const referenceInput = z.object({ reference: z.boolean() });
