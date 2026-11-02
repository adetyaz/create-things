/**
 * Memory receipts: proof that the pet's memory lives on Sui and Walrus (Breakdown §14). The account
 * object is read through Tatum's Sui gRPC gateway and cached for 10 minutes (Tatum's free plan allows
 * 3 requests a second; the account changes rarely). Memories themselves are Walrus blobs, so the
 * receipt also shows the user's latest one.
 */
import { and, count, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { memories } from '$lib/server/db/schema';
import { suiClient } from '$lib/server/integrations/tatum';
import { memoryClient } from '$lib/server/integrations/walrus/client';
import { requiredEnv } from '$lib/server/platform/env';
import { currentNamespace } from './namespace';

type Platform = App.Platform | undefined;

const CACHE_MS = 10 * 60 * 1000;
const EXPLORER = 'https://suiscan.xyz/mainnet';
const WALRUSCAN = 'https://walruscan.com/mainnet/blob';

export interface OnChainAccount {
	id: string;
	type: string;
	owner: string;
	/** Sui object version. Shared objects jump by large amounts, so it's not a count of changes. */
	version: string;
	explorerUrl: string;
	lastChange: { digest: string; at: string | null; explorerUrl: string } | null;
}

export interface MemoryReceipt {
	network: 'mainnet';
	account: OnChainAccount;
	yours: {
		sentToWalrus: number;
		namespace: string;
		/** The latest memory's Walrus blob: where the memory itself is stored. */
		latest: { summary: string; blobId: string; walruscanUrl: string } | null;
	};
	checkedAt: string;
	/** True when the on-chain part came from the 10-minute cache. */
	cached: boolean;
}

let cache: { at: number; account: OnChainAccount } | null = null;

export async function memoryReceipt(platform: Platform, userId: string): Promise<MemoryReceipt> {
	const fresh = !cache || Date.now() - cache.at > CACHE_MS;
	if (fresh)
		cache = { at: Date.now(), account: await readAccount(requiredEnv('MEMWAL_ACCOUNT_ID')) };

	const sentToUser = and(
		eq(memories.userId, userId),
		eq(memories.status, 'sent'),
		isNull(memories.deletedAt)
	);
	const [namespace, [{ sent }], [newest]] = await Promise.all([
		currentNamespace(platform, userId),
		withDb(platform, (db) => db.select({ sent: count() }).from(memories).where(sentToUser)),
		withDb(platform, (db) =>
			db
				.select()
				.from(memories)
				.where(and(sentToUser, isNotNull(memories.walrusJobId), isNotNull(memories.namespace)))
				.orderBy(desc(memories.createdAt))
				.limit(1)
		)
	]);
	return {
		network: 'mainnet',
		account: cache!.account,
		yours: { sentToWalrus: sent, namespace, latest: newest ? await latestBlob(newest) : null },
		checkedAt: new Date(cache!.at).toISOString(),
		cached: !fresh
	};
}

/** The account object and the transaction that last changed it: 2 Tatum gRPC calls. */
async function readAccount(id: string): Promise<OnChainAccount> {
	const sui = suiClient('mainnet');
	const { object } = await sui.getObject({ objectId: id, include: { previousTransaction: true } });
	let lastChange: OnChainAccount['lastChange'] = null;
	if (object.previousTransaction) {
		const tx = await sui.getTransaction({ digest: object.previousTransaction });
		const done = tx.Transaction ?? tx.FailedTransaction;
		lastChange = {
			digest: object.previousTransaction,
			at: done?.timestampMs ? new Date(done.timestampMs).toISOString() : null,
			explorerUrl: `${EXPLORER}/tx/${object.previousTransaction}`
		};
	}
	return {
		id,
		type: object.type,
		owner: ownerOf(object.owner),
		version: object.version,
		explorerUrl: `${EXPLORER}/object/${id}`,
		lastChange
	};
}

/** Who owns the account, in words. */
function ownerOf(owner: { $kind: string; AddressOwner?: string; ObjectOwner?: string }): string {
	switch (owner.$kind) {
		case 'AddressOwner':
			return owner.AddressOwner ?? 'an address';
		case 'ObjectOwner':
			return `object ${owner.ObjectOwner}`;
		case 'Shared':
			return 'shared';
		case 'Immutable':
			return 'immutable';
		default:
			return owner.$kind;
	}
}

/** The Walrus blob holding a memory, from its job ids (one relayer lookup, no Tatum calls). */
async function latestBlob(
	row: typeof memories.$inferSelect
): Promise<MemoryReceipt['yours']['latest']> {
	try {
		const { results } = await memoryClient(row.namespace!).getRememberBulkStatus(
			row.walrusJobId!.split(',')
		);
		const blobId = results.find((r) => r.blob_id)?.blob_id;
		return blobId ? { summary: row.summary, blobId, walruscanUrl: `${WALRUSCAN}/${blobId}` } : null;
	} catch (e) {
		console.error('[receipts] blob lookup failed', e);
		return null;
	}
}
