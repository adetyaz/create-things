import { json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { voiceInput } from '$lib/server/features/voice/input';
import { hearRamble } from '$lib/server/features/voice/service';

/** POST /api/voice { audio (base64), mime }: a ramble → transcript → ideas to approve (2 credits). */
export const POST: RequestHandler = async (event) => {
	const input = validate(voiceInput, await event.request.json().catch(() => ({})));
	return json(await hearRamble(event.platform, currentUserId(event), input));
};
