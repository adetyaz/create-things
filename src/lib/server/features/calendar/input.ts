import { z } from 'zod';

/** PUT /api/calendar { icsUrl }: a calendar's private ICS link, or null to disconnect. */
export const icsInput = z.object({ icsUrl: z.string().trim().max(2000).nullable() });

/** POST /api/calendar/feed { rotate? }: the private link to subscribe to your blocks. */
export const feedInput = z.object({ rotate: z.boolean().optional() });
