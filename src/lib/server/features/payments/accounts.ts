/**
 * Each user's Sui account, made and kept by the app: no wallet, no seed phrase, no SUI needed
 * (the app pays the gas). On testnet it can be filled from the faucet; on mainnet, by an on-ramp.
 */
import { and, eq } from 'drizzle-orm';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { withDb } from '$lib/server/db';
import { suiAccounts } from '$lib/server/db/schema';
import { decrypt, encrypt } from '$lib/server/features/sources/crypto';
import { network, reader, SUI_TYPE, usdcType, explorer } from './network';

type Platform = App.Platform | undefined;

/** The user's account on the current network, made the first time it's needed. */
export async function accountFor(platform: Platform, userId: string) {
	const net = network();
	const [row] = await withDb(platform, (db) =>
		db
			.select()
			.from(suiAccounts)
			.where(and(eq(suiAccounts.userId, userId), eq(suiAccounts.network, net)))
	);
	if (row) return { address: row.address, network: net };
	const keypair = new Ed25519Keypair();
	const address = keypair.toSuiAddress();
	await withDb(platform, async (db) =>
		db
			.insert(suiAccounts)
			.values({
				userId,
				network: net,
				address,
				secretEncrypted: await encrypt(keypair.getSecretKey())
			})
			.onConflictDoNothing()
	);
	return accountFor(platform, userId);
}

/** The user's signing key (server only; never returned by the API). */
export async function keypairFor(platform: Platform, userId: string): Promise<Ed25519Keypair> {
	const net = network();
	const [row] = await withDb(platform, (db) =>
		db
			.select({ secret: suiAccounts.secretEncrypted })
			.from(suiAccounts)
			.where(and(eq(suiAccounts.userId, userId), eq(suiAccounts.network, net)))
	);
	if (!row) throw new Error('No account yet');
	return Ed25519Keypair.fromSecretKey(await decrypt(row.secret));
}

/** SUI and USDC held, in whole units (read through Tatum). */
export async function balancesOf(address: string) {
	const client = reader();
	const read = async (coinType: string, decimals: number) => {
		try {
			const { balance } = await client.getBalance({ owner: address, coinType });
			return Number(balance.balance) / 10 ** decimals;
		} catch {
			return 0;
		}
	};
	return { sui: await read(SUI_TYPE, 9), usdc: await read(usdcType(), 6) };
}

/** What the payments screen shows (the address only behind "details"). */
export async function accountView(platform: Platform, userId: string) {
	const account = await accountFor(platform, userId);
	return {
		network: account.network,
		balances: await balancesOf(account.address),
		details: { address: account.address, explorerUrl: `${explorer()}/account/${account.address}` }
	};
}

/** Testnet only: fill the account from Sui's faucet (free test SUI). */
export async function testFunds(platform: Platform, userId: string) {
	const net = network();
	if (net !== 'testnet') return { status: 'mainnet' as const };
	const { address } = await accountFor(platform, userId);
	await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: address });
	return { status: 'requested' as const, address };
}
