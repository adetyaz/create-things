import { z } from 'zod';

/** POST /api/journal: an entry or a one-line check-in, about anything. */
export const entryInput = z.object({
	kind: z.enum(['entry', 'check_in']).default('entry'),
	body: z.string().trim().min(1).max(10_000),
	/** What it's about; omitted, the app works it out (free rules, then a small check). */
	itemId: z.uuid().optional(),
	stepId: z.uuid().optional(),
	/** True: it's about the day in general, so don't guess an item. */
	aboutDay: z.boolean().optional(),
	source: z.enum(['manual', 'pomodoro', 'check_in', 'voice']).optional()
});

export type EntryInput = z.infer<typeof entryInput>;

/** POST /api/journal/[id]/cards { cards }: save approved flashcards. */
export const saveCardsInput = z.object({
	cards: z
		.array(
			z.object({
				prompt: z.string().trim().min(1).max(300),
				answer: z.string().trim().min(1).max(600)
			})
		)
		.min(1)
		.max(5)
});
