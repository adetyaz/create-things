/**
 * Server secrets and settings, read at runtime ($env/dynamic: Workers secrets in production,
 * .env locally). Use these instead of importing $env directly, so a missing key fails with its name.
 */
import { env } from '$env/dynamic/private';

export function optionalEnv(name: string): string | undefined {
	const value = env[name];
	return value ? value : undefined;
}

export function requiredEnv(name: string): string {
	const value = optionalEnv(name);
	if (!value) throw new Error(`${name} is not set`);
	return value;
}
