import type { RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { chatInput } from '$lib/server/features/chat/input';
import { payForProAnswer } from '$lib/server/features/payments/mpp';

/**
 * POST /api/payments/pro-answer { chat request }: the app's Pro answer button. Pays over MPP from
 * your app-made Sui account (the app pays the gas) → { answer, payment: { digest, explorerUrl } }.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(chatInput, await event.request.json().catch(() => ({})));
	return payForProAnswer(event.platform, currentUserId(event), input);
};
