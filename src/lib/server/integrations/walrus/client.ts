import { optionalEnv, requiredEnv } from '$lib/server/platform/env';
import { MemWal } from '@mysten-incubation/memwal';

/** Namespace for the pet's real memories. Checks and tests use their own namespaces. */
export const MEMORY_NAMESPACE = 'createthings';

const clients = new Map<string, MemWal>();

/** Walrus Memory client using the server's delegate key. Server-only. */
export function memoryClient(namespace = MEMORY_NAMESPACE): MemWal {
	let client = clients.get(namespace);
	if (!client) {
		client = MemWal.create({
			key: requiredEnv('MEMWAL_PRIVATE_KEY'),
			accountId: requiredEnv('MEMWAL_ACCOUNT_ID'),
			serverUrl: optionalEnv('MEMWAL_SERVER_URL'),
			namespace
		});
		clients.set(namespace, client);
	}
	return client;
}
