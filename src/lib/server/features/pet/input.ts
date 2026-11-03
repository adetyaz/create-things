import { z } from 'zod';
import { breedOf } from './species';

/** POST /api/pet: adopt a pet (onboarding). */
export const adoptInput = z
	.object({
		species: z.string().trim().min(1),
		breed: z.string().trim().min(1),
		name: z.string().trim().min(1).max(40)
	})
	.refine(
		(v) => !!breedOf(v.species, v.breed),
		'unknown species or breed (see GET /api/pet/species)'
	);

export type AdoptInput = z.infer<typeof adoptInput>;

/** POST /api/dev/pet: pretend the last meal was this many days ago (dev only). */
export const lastFedInput = z.object({ daysAgo: z.number().int().min(0).max(400) });
