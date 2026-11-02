// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Bindings } from '$lib/server/platform/bindings';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Set from a device connection token (the extension), until sign-in exists. */
			userId?: string;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Bindings;
			ctx: { waitUntil(promise: Promise<unknown>): void };
		}
	}
}

export {};
