import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}$/, 'must be HH:MM');

/** POST /api/reminders/[id]: what the user did with it. */
export const actInput = z.object({
	action: z.enum(['start', 'two_minute', 'move', 'done', 'open', 'dismiss'])
});

/** PUT /api/reminders/settings: how many a day, usual times for habit anchors. */
export const reminderSettingsInput = z.object({
	perDay: z.number().int().min(0).max(10).optional(),
	anchorTimes: z.record(z.string().trim().min(1).max(60), time).optional()
});
