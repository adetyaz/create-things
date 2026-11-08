import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { confirmPayment } from '$lib/server/features/payments/service';

const confirmInput = z.object({
	/** The Sui transaction digest from the wallet. */
	txDigest: z
		.string()
		.trim()
		.regex(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/, 'not a Sui transaction digest'),
	/** small | medium | large | pro_answer */
	pack: z.string().trim().min(1).max(40)
});

/**
 * POST /api/payments/confirm { txDigest, pack }: checks the payment on Sui through Tatum and adds
 * the credits (once per transaction). A Pro answer adds exactly one Pro chat's credits; then send
 * POST /api/chat with { tier: 'pro' }.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(confirmInput, await event.request.json().catch(() => ({})));
	const result = await confirmPayment(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(422, result.message);
	return json(result);
};
