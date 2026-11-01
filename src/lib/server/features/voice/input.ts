import { z } from 'zod';

/** About 6 MB of audio as base64: roughly 3 minutes of compressed speech. */
const MAX_BASE64 = 8_000_000;

/** Body of POST /api/voice: one recorded ramble. */
export const voiceInput = z.object({
	audio: z.string().min(1).max(MAX_BASE64),
	mime: z.enum([
		'audio/wav',
		'audio/mpeg',
		'audio/mp4',
		'audio/aac',
		'audio/ogg',
		'audio/flac',
		'audio/webm'
	])
});

export type VoiceInput = z.infer<typeof voiceInput>;
