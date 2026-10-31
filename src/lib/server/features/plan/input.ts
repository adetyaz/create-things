import { z } from 'zod';

const uuid = z.uuid();
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
const label = z.string().trim().min(1).max(60);

const block = z.object({
	day: z.iso.date(),
	startTime: clock.nullish(),
	/** A habit to follow instead of a clock time, e.g. "after coffee". */
	anchor: label.nullish(),
	place: label.nullish()
});

/** Body of POST /api/plan/month. */
export const planMonthInput = z.object({
	goalItemIds: z.array(uuid).min(1).max(3),
	review: z.string().trim().max(1000).optional()
});

/** Body of PATCH /api/plan/month: bring an item back from the not-this-month list. */
export const unparkInput = z.object({ itemId: uuid });

/** Body of POST /api/plan/week: the blocks the user has; the pet fills them. */
export const proposeWeekInput = z.object({ blocks: z.array(block).min(1).max(21) });

/** Body of PUT /api/plan/week: the adjusted week to save. */
export const saveWeekInput = z.object({
	blocks: z
		.array(block.extend({ stepId: uuid }))
		.min(1)
		.max(21)
		.refine(
			(b) => new Set(b.map((x) => x.stepId)).size === b.length,
			'A step can only be in one block'
		)
});

/** Body of POST /api/plan/tomorrow: up to 3 steps, most important first (Ivy Lee). */
export const rankTomorrowInput = z.object({
	stepIds: z
		.array(uuid)
		.min(1)
		.max(3)
		.refine((ids) => new Set(ids).size === ids.length, 'Each step once')
});

export type BlockInput = z.infer<typeof block>;
export type PlanMonthInput = z.infer<typeof planMonthInput>;
export type SaveWeekInput = z.infer<typeof saveWeekInput>;
