import { z } from 'zod';

const httpUrl = z.url().refine((v) => /^https?:\/\//i.test(v), 'must be an http(s) URL');

/** POST /api/imports: a batch from one board / folder / channel. */
export const importInput = z.object({
	source: z.enum(['x', 'pinterest', 'arena']),
	collection: z.object({
		externalId: z.string().trim().max(200).optional(),
		title: z.string().trim().min(1).max(200)
	}),
	items: z
		.array(
			z.object({
				url: httpUrl,
				externalId: z.string().trim().min(1).max(200),
				title: z.string().trim().min(1).max(200).optional(),
				text: z.string().trim().max(2000).optional()
			})
		)
		.min(1)
		.max(50)
});

export type ImportInput = z.infer<typeof importInput>;

/** POST /api/imports/done { collectionId, count }: the import's one memory. */
export const doneInput = z.object({
	collectionId: z.uuid(),
	count: z.number().int().min(0).max(100_000)
});

/** POST /api/collections/[id]/analyse { count }: analyse the next N (cost shown before). */
export const analyseInput = z.object({ count: z.number().int().min(1).max(50) });
