import { z } from 'zod';

/** Body of POST /api/reviews/[id]. */
export const rateInput = z.object({ rating: z.enum(['got_it', 'shaky', 'forgot']) });

/** Body of POST /api/items/[id]/quiz. */
export const quizInput = z.object({ milestone: z.string().trim().min(1).max(200).optional() });

/** Body of POST /api/items/[id]/quiz/result: the questions they got wrong. */
export const quizResultInput = z.object({
	total: z.number().int().min(1).max(20),
	wrong: z
		.array(
			z.object({
				question: z.string().trim().min(1).max(500),
				answer: z.string().trim().min(1).max(300),
				explanation: z.string().trim().max(500).default(''),
				topic: z.string().trim().max(80).default('general')
			})
		)
		.max(20)
});
