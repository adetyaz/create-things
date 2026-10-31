import { error } from '@sveltejs/kit';
import type { z } from 'zod';

/** Parses input with a zod schema, or fails the request with a 400 naming the first problem. */
export function validate<Schema extends z.ZodType>(
	schema: Schema,
	input: unknown
): z.infer<Schema> {
	const result = schema.safeParse(input);
	if (result.success) return result.data;
	const issue = result.error.issues[0];
	const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
	error(400, `${where}${issue.message}`);
}

/** Item ids are UUIDs; anything else is a 400 before touching the database. */
export function uuidParam(value: string | undefined): string {
	if (!value || !/^[0-9a-f-]{36}$/i.test(value)) error(400, 'Not a valid id');
	return value;
}
