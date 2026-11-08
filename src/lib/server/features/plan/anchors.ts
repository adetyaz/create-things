/** Usual times for common habit anchors ("after coffee"), until the user sets their own. */
export const DEFAULT_ANCHOR_TIMES: Record<string, string> = {
	'after coffee': '08:00',
	'after breakfast': '08:30',
	'after lunch': '13:00',
	'after work': '18:00',
	'after dinner': '19:30',
	'before bed': '21:30'
};

/** The user's anchor times over the defaults. */
export function anchorTimesOf(saved: unknown): Record<string, string> {
	return { ...DEFAULT_ANCHOR_TIMES, ...((saved as Record<string, string> | null) ?? {}) };
}
