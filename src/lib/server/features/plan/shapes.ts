/**
 * Plan shapes: how a plan is laid out. Add a shape here (Code layout rule 8). Shapes that aren't
 * built yet fall back to another, so an intent can point at them before they exist.
 */

export interface PlanShape {
	label: string;
	available: boolean;
	/** Used while this shape isn't available. */
	fallback?: string;
}

export const PLAN_SHAPES = {
	roadmap: { label: 'Roadmap of small steps', available: true },
	tasters: { label: '2–3 taster sessions, then decide', available: false, fallback: 'roadmap' },
	recurring: { label: 'Recurring care or habit', available: false, fallback: 'roadmap' }
} as const satisfies Record<string, PlanShape>;

export type PlanShapeId = keyof typeof PLAN_SHAPES;

/** The shape to actually use: the requested one, or its fallback while it isn't built. */
export function resolveShape(id: PlanShapeId): PlanShapeId {
	const shape: PlanShape = PLAN_SHAPES[id];
	return shape.available || !shape.fallback ? id : resolveShape(shape.fallback as PlanShapeId);
}
