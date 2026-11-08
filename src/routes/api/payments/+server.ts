import { json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { paymentOptions, paymentsOf } from '$lib/server/features/payments/service';

/**
 * GET /api/payments: packs and the one-off Pro answer, priced in USDC and SUI (Tatum rate), where
 * to pay, and your past payments.
 */
export const GET: RequestHandler = async (event) => {
	return json({
		...(await paymentOptions()),
		yours: await paymentsOf(event.platform, currentUserId(event))
	});
};
