import { env } from '$env/dynamic/private';
import { MemWal } from '@mysten-incubation/memwal';

/** Namespace for the pet's real memories. Checks and tests use their own namespaces. */
export const MEMORY_NAMESPACE = 'createthings';

const clients = new Map<string, MemWal>();

/** Walrus Memory client using the server's delegate key. Server-only. */
export function memoryClient(namespace = MEMORY_NAMESPACE): MemWal {
	let client = clients.get(namespace);
	if (!client) {
		if (!env.MEMWAL_PRIVATE_KEY || !env.MEMWAL_ACCOUNT_ID) {
			throw new Error('MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID must be set');
		}
		client = MemWal.create({
			key: env.MEMWAL_PRIVATE_KEY,
			accountId: env.MEMWAL_ACCOUNT_ID,
			serverUrl: env.MEMWAL_SERVER_URL || undefined,
			namespace
		});
		clients.set(namespace, client);
	}
	return client;
}
