import type { RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { proAnswer } from '$lib/server/features/payments/mpp';

/**
 * POST /api/mpp/pro-answer { chat request }: pay-per-answer with MPP on Sui. Without payment →
 * 402 with the price; any MPP client (suimpp "sui/charge") pays and retries → the Pro answer plus a
 * Payment-Receipt header. Who it's for: x-createthings-token (Authorization carries the payment).
 */
export const POST: RequestHandler = async (event) =>
	proAnswer(event.platform, currentUserId(event), event.request);
