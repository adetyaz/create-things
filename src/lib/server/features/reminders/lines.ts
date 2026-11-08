/**
 * What reminders say, in the pet's voice: ready-made lines (no AI, free), gentle or firm by the
 * tone slider. Warm, never guilt-tripping (design PRD A5).
 */

export type Tone = 'gentle' | 'firm';

export function toneOf(slider: number): Tone {
	return slider >= 60 ? 'firm' : 'gentle';
}

type Line = (v: Record<string, string>) => string;

export const LINES: Record<string, Record<Tone, Line>> = {
	block_start: {
		gentle: (v) => `${v.pet}: it's time for "${v.step}". Just the 2-minute version counts.`,
		firm: (v) => `${v.pet}: "${v.step}". Now. Two minutes and you're in.`
	},
	never_miss_twice: {
		gentle: (v) =>
			`${v.pet}: missing once is fine. Let's not miss twice: ${v.twoMinute ?? `just open "${v.step}"`}.`,
		firm: (v) => `${v.pet}: yesterday slipped. Not today: ${v.twoMinute ?? `"${v.step}"`}.`
	},
	check_in: {
		gentle: (v) => `${v.pet}: how did it go? One line about ${v.about} is plenty.`,
		firm: (v) => `${v.pet}: check-in time. One line about ${v.about}. Go.`
	},
	reviews_due: {
		gentle: (v) => `${v.pet}: ${v.count} quick question${v.count === '1' ? '' : 's'} so it sticks.`,
		firm: (v) => `${v.pet}: ${v.count} review${v.count === '1' ? '' : 's'}. Two minutes.`
	},
	pet_hungry: {
		gentle: (v) => `${v.pet} is ${v.mood}. One step, a review or a check-in feeds them.`,
		firm: (v) => `${v.pet} is ${v.mood} and staring at you. Feed them: one step will do.`
	},
	shutdown: {
		gentle: (v) => `${v.pet}: wrap up today? Pick tomorrow's top 3 and you're done.`,
		firm: (v) => `${v.pet}: shutdown. Tomorrow's top 3, then rest.`
	},
	weekly_plan: {
		gentle: (v) => `${v.pet}: plan the week? Tell me how many blocks you have; I'll fill them.`,
		firm: (v) => `${v.pet}: week plan. How many blocks? I'll do the rest.`
	}
};

export function line(kind: string, tone: Tone, values: Record<string, string>): string {
	const pick = LINES[kind]?.[tone];
	return pick ? pick(values) : (values.title ?? 'createthings');
}
