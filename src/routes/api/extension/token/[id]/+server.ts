import { error, json, type RequestHandler } from '@sveltejs/kit';
import { uuidParam } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { revokeToken } from '$lib/server/features/devices/service';

/** DELETE /api/extension/token/[id]: disconnect a device. */
export const DELETE: RequestHandler = async (event) => {
	const revoked = await revokeToken(
		event.platform,
		currentUserId(event),
		uuidParam(event.params.id)
	);
	if (!revoked) error(404, 'No connected device with that id');
	return json({ revoked });
};
