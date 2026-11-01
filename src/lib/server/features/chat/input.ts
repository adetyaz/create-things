import { z } from 'zod';

const message = z.object({
	role: z.enum(['user', 'pet']),
	text: z.string().trim().min(1).max(2000)
});

/** Body of POST /api/chat. The app sends the last few messages; the newest must be the user's. */
export const chatInput = z.object({
	mode: z.enum(['chat', 'stuck', 'teach']).default('chat'),
	itemId: z.uuid().optional(),
	stepId: z.uuid().optional(),
	messages: z
		.array(message)
		.min(1)
		.max(12)
		.refine((m) => m.at(-1)?.role === 'user', 'The last message must be from the user')
});

export type ChatInput = z.infer<typeof chatInput>;
