import { z } from 'zod';
import { rhythmSchema } from '$lib/server/features/templates/rhythm';
import { adoptInput } from '$lib/server/features/pet/input';

/** POST /api/onboarding/suggest { sentence }. */
export const suggestInput = z.object({ sentence: z.string().trim().min(3).max(500) });

/** POST /api/onboarding: everything chosen (all optional but the types; defaults fill the rest). */
export const completeInput = z.object({
	templates: z.array(z.string()).max(3).default([]),
	rhythm: rhythmSchema.optional(),
	reviews: z
		.object({ on: z.boolean(), cap: z.number().int().min(1).max(20).optional() })
		.optional(),
	leniency: z.enum(['gentle', 'firm']).optional(),
	hungerMode: z.enum(['days', 'check_ins']).optional(),
	/** The tone slider, 0 gentle … 100 savage. */
	tone: z.number().int().min(0).max(100).optional(),
	pet: adoptInput.optional(),
	/** 3–5 things on their mind: notes or links (each becomes an item and is analysed). */
	brainDump: z.array(z.string().trim().min(1).max(2000)).max(10).optional()
});

export type CompleteInput = z.infer<typeof completeInput>;

/** PUT /api/settings/rhythm. */
export const rhythmUpdateInput = z.object({
	templates: z.array(z.string()).max(3).optional(),
	rhythm: rhythmSchema.optional(),
	reviews: z
		.object({ on: z.boolean(), cap: z.number().int().min(1).max(20).optional() })
		.optional(),
	hungerMode: z.enum(['days', 'check_ins']).optional(),
	leniency: z.enum(['gentle', 'firm']).optional()
});

/** PUT /api/items/[id]/rhythm { rhythm | null }. */
export const itemRhythmInput = z.object({ rhythm: rhythmSchema.nullable() });

/** PUT /api/pet/rest { until: YYYY-MM-DD | null }. */
export const restInput = z.object({ until: z.iso.date().nullable() });
