import { json, type RequestHandler } from '@sveltejs/kit';
import { SPECIES } from '$lib/server/features/pet/species';

/** GET /api/pet/species: species and breeds with their personality and sample lines (onboarding). */
export const GET: RequestHandler = async () => json({ species: SPECIES });
