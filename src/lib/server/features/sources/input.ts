import { z } from 'zod';

/** POST /api/sources/arena/channels: bring a channel in, and what its blocks become. */
export const channelInput = z.object({
	id: z.number().int().positive(),
	title: z.string().trim().min(1).max(200),
	mode: z.enum(['triage', 'shortlist', 'reference']).default('reference')
});

/** POST /api/sources/arena/sync { collectionId? }: one channel, or all. */
export const syncInput = z.object({ collectionId: z.uuid().optional() });

/** POST /api/sources/arena/share { itemId, description? }: after the user said yes. */
export const shareInput = z.object({
	itemId: z.uuid(),
	description: z.string().trim().max(500).optional()
});

/** PUT /api/sources/[source]/settings: e.g. Are.na write-back on, and its channel. */
export const sourceSettingsInput = z.object({
	writeBack: z.boolean().optional(),
	shareChannelId: z.number().int().positive().optional()
});
