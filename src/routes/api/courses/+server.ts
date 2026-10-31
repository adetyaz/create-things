import { error, json, type RequestHandler } from '@sveltejs/kit';
import { validate } from '$lib/server/platform/http';
import { currentUserId } from '$lib/server/platform/user';
import { courseInput } from '$lib/server/features/courses/input';
import { importCourse } from '$lib/server/features/courses/service';

/** POST /api/courses { files: [{ mime, data (base64) }], title?, note? }: read a syllabus into a course. */
export const POST: RequestHandler = async (event) => {
	const input = validate(courseInput, await event.request.json().catch(() => ({})));
	const result = await importCourse(event.platform, currentUserId(event), input);
	if (result.status === 'unreadable') error(422, result.reason);
	return json(result, { status: 201 });
};
