import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { buy } from '$lib/server/features/payments/service';

const buyInput = z.object({
	/** small | medium | large | pro_answer */
	pack: z.string().trim().min(1).max(40),
	/** Optional: pay in this coin (default: USDC if there's enough, else SUI). */
	coin: z.enum(['usdc', 'sui']).optional()
});

/**
 * POST /api/payments/buy { pack, coin? }: pays from your app-made Sui account (the app pays the
 * gas), confirms it through Tatum, and adds the credits → { credits, balance, coin, explorerUrl }.
 * A Pro answer adds exactly one Pro chat's credits; then POST /api/chat with { tier: 'pro' }.
 */
export const POST: RequestHandler = async (event) => {
	const input = validate(buyInput, await event.request.json().catch(() => ({})));
	const result = await buy(event.platform, currentUserId(event), input);
	if (result.status === 'invalid') error(422, result.message);
	return json(result);
};
