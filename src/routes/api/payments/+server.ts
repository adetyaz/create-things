import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { paymentOptions, paymentsOf } from '$lib/server/features/payments/service';

/**
 * GET /api/payments: packs and the one-off Pro answer (USDC and SUI prices, Tatum rate), your
 * account (balances; its address only under details), and your past payments with links.
 */
export const GET: RequestHandler = async (event) => {
	const userId = currentUserId(event);
	return json({
		...(await paymentOptions(event.platform, userId)),
		yours: await paymentsOf(event.platform, userId)
	});
};
