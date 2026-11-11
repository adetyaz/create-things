/**
 * The one way screens talk to the server: same-origin JSON. Failures throw ApiError with the
 * server's message (written for people, show it as is), its status, and `code` for the cases the
 * UI handles specially (see docs/ui-guide.md).
 */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: 'out_of_credits',
		/** With out_of_credits: the credits that action needs. */
		readonly cost?: number
	) {
		super(message);
	}
	/** Not signed in (only once REQUIRE_SIGN_IN is on). */
	get needsSignIn() {
		return this.status === 401;
	}
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
	let res: Response;
	try {
		res = await fetch(path, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
	} catch {
		throw new ApiError("Can't reach createthings. Check your connection and try again.", 0);
	}
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		throw new ApiError(
			data?.message ?? `Something went wrong (${res.status}). Try again.`,
			res.status,
			data?.code,
			data?.cost
		);
	}
	return data as T;
}
