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

/** Body of PATCH /api/plan/slots/[id]. A time replaces an anchor and vice versa. */
export const moveInput = z
	.object({
		day: z.iso.date().optional(),
		startTime: clock.nullable().optional(),
		anchor: label.nullable().optional(),
		place: label.nullable().optional()
	})
	.refine((m) => Object.keys(m).length > 0, 'Nothing to change')
	.refine((m) => !(m.startTime && m.anchor), 'A block has a time or an anchor, not both');

/** Body of POST /api/plan/reshuffle: the moves the user OK'd. */
export const reshuffleInput = z.object({
	moves: z
		.array(block.extend({ slotId: uuid }))
		.max(30)
		.default([]),
	/** Blocks to unplan; their steps stay in the roadmap. */
	drop: z.array(uuid).max(30).default([]),
	/** Never miss twice: this block becomes today's #1. */
	firstToday: uuid.optional()
});

/** Body of POST /api/plan/shutdown: moves for today's unfinished blocks and tomorrow's top 3. */
export const shutdownInput = z.object({
	moves: z
		.array(block.extend({ slotId: uuid }))
		.max(30)
		.default([]),
	drop: z.array(uuid).max(30).default([]),
	/** Up to 3 steps, most important first (Ivy Lee). */
	tomorrow: z
		.array(uuid)
		.max(3)
		.default([])
		.refine((ids) => new Set(ids).size === ids.length, 'Each step once'),
	/** How the day went, in their words; kept short in memory. */
	note: z.string().trim().max(500).optional()
});

/** Body of POST /api/plan/fit. */
export const fitInput = z.object({ itemId: uuid });

/** Body of PUT /api/plan/fit. */
export const applyFitInput = z.object({
	itemId: uuid,
	choice: z.enum(['add_step', 'swap', 'park', 'note']),
	/** The item to add the idea to (add_step, swap); defaults to the related item found. */
	relatedItemId: uuid.optional(),
	/** park: defaults to the suggested day. */
	parkUntil: z.iso.date().optional()
});

/** Body of POST /api/plan/periods/[kind]: goals (up to the period's limit), and for the year themes. */
export const horizonInput = z
	.object({
		goalItemIds: z.array(uuid).max(10).default([]),
		/** Year: 1–3 themes in their words. */
		themes: z.array(z.string().trim().min(2).max(100)).max(3).optional(),
		/** Year: who they want to become. */
		intention: z.string().trim().min(3).max(200).optional(),
		review: z.string().trim().max(2000).optional()
	})
	.refine(
		(h) => h.goalItemIds.length > 0 || (h.themes?.length ?? 0) > 0,
		'Pick at least one goal or theme'
	);

export type BlockInput = z.infer<typeof block>;
export type PlanMonthInput = z.infer<typeof planMonthInput>;
export type SaveWeekInput = z.infer<typeof saveWeekInput>;
export type HorizonInput = z.infer<typeof horizonInput>;
export type MoveInput = z.infer<typeof moveInput>;
export type ReshuffleInput = z.infer<typeof reshuffleInput>;
export type ShutdownInput = z.infer<typeof shutdownInput>;
export type ApplyFitInput = z.infer<typeof applyFitInput>;
