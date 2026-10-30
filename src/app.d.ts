// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			notionToken?: string;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Record<string, unknown>;
			ctx: { waitUntil(promise: Promise<unknown>): void };
		}
	}
}

export {};
