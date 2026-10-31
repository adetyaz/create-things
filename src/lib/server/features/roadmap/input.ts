import { z } from 'zod';
import { isIntentId } from '$lib/server/features/intents/registry';

/** Body of PATCH /api/items/[id]/roadmap: one of the suggested goals, or the user's own. */
export const setGoalInput = z.object({ goal: z.string().trim().min(5).max(200) });

/** Body of POST /api/items/[id]/tasters: what to do after the taster sessions. */
export const tasterInput = z.object({
	choice: z.enum(['keep', 'park', 'let_go']),
	/** keep: what it becomes (default: learn a skill). */
	intent: z.string().refine(isIntentId, 'Not a known intent').optional(),
	/** park: until when (default: the start of next month). */
	until: z.iso.date().optional(),
	/** Why, in their words; remembered as a short summary. */
	note: z.string().trim().max(1000).optional()
});

export type TasterInput = z.infer<typeof tasterInput>;
