/**
 * Voice ("just yap"): speech → separate ideas with a suggested place. Nothing is added until the
 * user approves an idea (captured as an item; fit-it-in offers where it goes). The transcript stays
 * in Postgres; memory only gets the idea titles (Breakdown §13, Flow 14).
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { items, voiceCaptures } from '$lib/server/db/schema';
import { generateJson, transcribe } from '$lib/server/ai';
import { withCredits } from '$lib/server/features/credits/service';
import { remember } from '$lib/server/features/memory/service';
import type { VoiceInput } from './input';
import { readVoice, VOICE_SYSTEM, voicePrompt, type VoiceIdea } from './prompt';

type Platform = App.Platform | undefined;

export type VoiceResult =
	| { status: 'split'; id: string; transcript: string; ideas: VoiceIdea[] }
	| { status: 'empty'; transcript: string };

export async function hearRamble(
	platform: Platform,
	userId: string,
	input: VoiceInput
): Promise<VoiceResult> {
	const audio = {
		mime: input.mime,
		bytes: Uint8Array.from(atob(input.audio), (c) => c.charCodeAt(0))
	};
	const known = await knownTitles(platform, userId);

	const result = await withCredits(
		platform,
		userId,
		'voice',
		async () => {
			// Production: Whisper, then a text model splits it. Locally: one model reads the audio.
			const transcript = await transcribe(platform, audio);
			const reply = await generateJson(platform, {
				system: VOICE_SYSTEM,
				prompt: voicePrompt({ transcript, known }),
				files: transcript ? undefined : [audio],
				maxTokens: 2000
			});
			const read = readVoice(reply.data, transcript, known);
			// Thrown inside withCredits, so audio that couldn't be heard is refunded.
			if (!read.transcript) throw new Error('No speech could be made out');
			return read;
		},
		{ ref: 'voice' }
	);
	if (result.ideas.length === 0) return { status: 'empty', transcript: result.transcript };

	const [saved] = await withDb(platform, (db) =>
		db
			.insert(voiceCaptures)
			.values({ userId, transcript: result.transcript, ideas: result.ideas })
			.returning({ id: voiceCaptures.id })
	);

	// Memory gets the ideas in our words (their titles), never the transcript.
	await remember(platform, userId, {
		type: 'voice_ideas',
		summary: `Talked through ${result.ideas.length} idea${result.ideas.length === 1 ? '' : 's'}: ${result.ideas.map((i) => i.title).join('; ')}.`,
		sourceType: 'voice',
		sourceId: saved.id
	}).catch((e) => console.error('[voice] remember failed', e));

	return { status: 'split', id: saved.id, transcript: result.transcript, ideas: result.ideas };
}

/** What a step could belong to: Focus first, then goals and the Shortlist, most recent first. */
async function knownTitles(platform: Platform, userId: string): Promise<string[]> {
	const rows = await withDb(platform, (db) =>
		db
			.select({ title: items.title, status: items.status })
			.from(items)
			.where(
				and(
					eq(items.userId, userId),
					inArray(items.status, ['focus', 'shortlist', 'ready', 'paused'])
				)
			)
			.orderBy(desc(items.lastActiveAt))
			.limit(30)
	);
	const focus = rows.filter((r) => r.status === 'focus');
	return [...new Set([...focus, ...rows].map((r) => r.title))].slice(0, 20);
}
