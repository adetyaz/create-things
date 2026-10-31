import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { horizonInput } from '$lib/server/features/plan/input';
import { getHorizon, planHorizon } from '$lib/server/features/plan/horizons';
import { PLAN_PERIODS, isPeriodId, type PeriodId } from '$lib/server/features/plan/periods';

/** Year, half-year, quarter (any registry period with `generic: true`); month and week have their own routes. */
function kindParam(value: string | undefined): PeriodId {
	if (!isPeriodId(value) || !PLAN_PERIODS[value].generic) error(404, 'Not a period planned here');
	return value;
}

/** GET /api/plan/periods/[kind]: the period's goals, themes, review questions and shortlist. */
export const GET: RequestHandler = async (event) => {
	return json(await getHorizon(event.platform, currentUserId(event), kindParam(event.params.kind)));
};

/** POST /api/plan/periods/[kind] { goalItemIds, themes?, intention?, review? }. */
export const POST: RequestHandler = async (event) => {
	const kind = kindParam(event.params.kind);
	const input = validate(horizonInput, await event.request.json().catch(() => ({})));
	const result = await planHorizon(event.platform, currentUserId(event), kind, input);
	if (result.status === 'invalid') error(400, result.reason);
	return json(result);
};
