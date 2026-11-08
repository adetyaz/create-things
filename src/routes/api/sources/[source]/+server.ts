import { error, json, type RequestHandler } from '@sveltejs/kit';
import { currentUserId } from '$lib/server/platform/user';
import { disconnect } from '$lib/server/features/sources/service';

/** DELETE /api/sources/[source]: disconnect (stops new imports; what came in stays). */
export const DELETE: RequestHandler = async (event) => {
	const ok = await disconnect(event.platform, currentUserId(event), event.params.source!);
	if (!ok) error(404, 'Not connected');
	return json({ disconnected: event.params.source });
};
