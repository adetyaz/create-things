import { z } from 'zod';

/** About 6 MB of file per page or photo, as base64. */
const MAX_BASE64 = 8_000_000;

const file = z.object({
	mime: z.enum(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']),
	/** The file's bytes as base64. */
	data: z.string().min(1).max(MAX_BASE64)
});

/** Body of POST /api/courses: a syllabus as a PDF or up to 10 photos/screenshots. */
export const courseInput = z.object({
	files: z.array(file).min(1).max(10),
	/** Fill in this saved thing (one the pet read as a course) instead of making a new one. */
	itemId: z.uuid().optional(),
	/** Optional: the course name, if the user wants to give it. */
	title: z.string().trim().min(1).max(200).optional(),
	note: z.string().trim().max(2000).optional()
});

export type CourseInput = z.infer<typeof courseInput>;
