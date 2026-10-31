import { z } from 'zod';
import { isIntentId } from './registry';
import { isPracticeKindId } from './practice';

/** Body of PUT /api/items/[id]/understanding. Send only what changed; an empty body confirms as is. */
export const confirmInput = z.object({
	intent: z.string().refine(isIntentId, 'Not a known intent').optional(),
	practiceKind: z
		.string()
		.refine(isPracticeKindId, 'Not a known kind of practice')
		.nullable()
		.optional(),
	goal: z.string().trim().min(5).max(200).optional(),
	targetDate: z.iso.date().nullable().optional()
});

export type ConfirmInput = z.infer<typeof confirmInput>;
