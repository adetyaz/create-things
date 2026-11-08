import { z } from 'zod';

/** POST /api/collections { title, itemIds? }: a collection made in the app. */
export const createInput = z.object({
	title: z.string().trim().min(1).max(200),
	itemIds: z.array(z.uuid()).max(500).optional()
});

/** PUT /api/collections/[id] { title?, mode?, goalItemId? }. */
export const updateInput = z.object({
	title: z.string().trim().min(1).max(200).optional(),
	mode: z.enum(['triage', 'shortlist', 'reference']).optional(),
	goalItemId: z.uuid().nullable().optional()
});

/** POST /api/collections/[id]/items { itemIds }. */
export const addItemsInput = z.object({ itemIds: z.array(z.uuid()).min(1).max(500) });
