// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Bindings } from '$lib/server/platform/bindings';

declare global {
	namespace App {
		/** What a failed request returns as JSON. `code` names failures the UI handles specially. */
		interface Error {
			message: string;
			/** 'out_of_credits': the free AI for today is used up and there aren't enough credits. */
			code?: 'out_of_credits';
			/** With out_of_credits: the credits that action needs. */
			cost?: number;
		}
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
