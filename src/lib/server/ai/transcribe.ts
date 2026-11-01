import { base64 } from './json';
import { MODELS } from './models';

/**
 * Speech to text with Workers AI's Whisper. Returns null where there's no Workers AI binding
 * (local development), so callers can hand the audio to a model that reads it directly instead.
 */
export async function transcribe(
	platform: App.Platform | undefined,
	audio: { bytes: Uint8Array }
): Promise<string | null> {
	const ai = platform?.env?.AI;
	if (!ai) return null;
	const reply = (await ai.run(MODELS.whisper, { audio: base64(audio.bytes) })) as { text?: string };
	const text = reply?.text?.trim();
	if (!text) throw new Error('Whisper returned no text');
	return text;
}
