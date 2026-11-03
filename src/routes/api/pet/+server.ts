import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { adoptInput } from '$lib/server/features/pet/input';
import { adoptPet, getPet } from '$lib/server/features/pet/service';

/** GET /api/pet: the pet, its mood and why, today's food and its feed history (null: no pet yet). */
export const GET: RequestHandler = async (event) => {
	return json({ pet: await getPet(event.platform, currentUserId(event)) });
};

/** POST /api/pet { species, breed, name }: adopt a pet (one at a time; a new one after a death). */
export const POST: RequestHandler = async (event) => {
	const input = validate(adoptInput, await event.request.json().catch(() => ({})));
	const pet = await adoptPet(event.platform, currentUserId(event), input);
	if (!pet) error(409, 'You already have a pet');
	return json({ pet }, { status: 201 });
};
