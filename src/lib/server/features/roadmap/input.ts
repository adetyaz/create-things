import { z } from 'zod';

/** Body of PATCH /api/items/[id]/roadmap: one of the suggested goals, or the user's own. */
export const setGoalInput = z.object({ goal: z.string().trim().min(5).max(200) });
