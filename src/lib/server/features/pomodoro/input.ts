import { z } from 'zod';

/** POST /api/pomodoro { stepId? }: start a focus session. */
export const startInput = z.object({ stepId: z.uuid().optional() });

/** POST /api/pomodoro/[id]/end { note? }: "What did you do?" */
export const endInput = z.object({ note: z.string().trim().min(1).max(2000).optional() });
