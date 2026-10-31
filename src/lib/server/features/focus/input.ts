import { z } from 'zod';

const uuid = z.uuid();

/** Body of POST /api/focus/pick. `exclude` holds items the user said "Not today" to. */
export const pickInput = z.object({
	minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
	energy: z.enum(['low', 'normal', 'high']),
	exclude: z.array(uuid).max(50).default([])
});

/** Body of POST /api/focus/decide. */
export const decideInput = z.object({
	itemId: uuid,
	decision: z.enum(['start', 'not_today', 'let_go'])
});

/** Body of POST /api/focus/pause. */
export const pauseInput = z.object({ itemId: uuid });

/** Body of POST /api/triage. */
export const triageInput = z.object({
	itemId: uuid,
	decision: z.enum(['keep', 'let_go', 'later'])
});

export type PickInput = z.infer<typeof pickInput>;
