import { error, json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { testFunds } from '$lib/server/features/payments/accounts';

/** POST /api/payments/test-funds: testnet only, free test SUI into your account from Sui's faucet. */
export const POST: RequestHandler = async (event) => {
	try {
		const result = await testFunds(event.platform, currentUserId(event));
		if (result.status === 'mainnet') error(409, 'Test funds only exist on testnet');
		return json(result);
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		error(429, `The faucet said no (it limits requests): ${e instanceof Error ? e.message : e}`);
	}
};
