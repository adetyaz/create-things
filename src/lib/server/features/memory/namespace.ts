import { dev } from '$app/environment';
import { optionalEnv } from '$lib/server/platform/env';

/**
 * One Walrus namespace per user, so recall never mixes users. Local runs write to a separate
 * `createthings-dev-*` space, keeping test memories apart from real ones.
 */
export function namespaceFor(userId: string): string {
	const local = dev || optionalEnv('LOCAL_DEV') === 'true';
	const prefix =
		optionalEnv('MEMORY_NAMESPACE_PREFIX') ?? (local ? 'createthings-dev' : 'createthings');
	return `${prefix}-${userId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
