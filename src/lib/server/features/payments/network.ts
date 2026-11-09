/**
 * Which Sui network payments use, and everything that depends on it: testnet by default,
 * SUI_NETWORK=mainnet to switch. Each network has its own app account (SUI_AGENT_KEY_TESTNET /
 * SUI_AGENT_KEY_MAINNET), which pays the gas for users and receives their payments.
 */
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { optionalEnv } from '$lib/server/platform/env';
import { suiClient, type SuiNetwork } from '$lib/server/integrations/tatum';

export function network(): SuiNetwork {
	return optionalEnv('SUI_NETWORK') === 'mainnet' ? 'mainnet' : 'testnet';
}

/** USDC on each network (Circle's native USDC); SUI_USDC_TYPE overrides it. */
const USDC: Record<SuiNetwork, string> = {
	mainnet: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
	testnet: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'
};

export const SUI_TYPE = '0x2::sui::SUI';

export function usdcType(net: SuiNetwork = network()): string {
	return optionalEnv('SUI_USDC_TYPE') ?? USDC[net];
}

export function explorer(net: SuiNetwork = network()): string {
	return `https://suiscan.xyz/${net}`;
}

/** The app's account on this network (pays gas, receives payments), or null if not set up. */
export function agentKeypair(net: SuiNetwork = network()): Ed25519Keypair | null {
	const secret = optionalEnv(net === 'mainnet' ? 'SUI_AGENT_KEY_MAINNET' : 'SUI_AGENT_KEY_TESTNET');
	return secret ? Ed25519Keypair.fromSecretKey(secret) : null;
}

/** Reads go through Tatum's Sui gateway. */
export function reader(net: SuiNetwork = network()) {
	return suiClient(net);
}

/** Sui's public full node: used to send a transaction if Tatum's gateway won't take it. */
const publicClients = new Map<SuiNetwork, SuiGrpcClient>();
export function publicNode(net: SuiNetwork = network()): SuiGrpcClient {
	let client = publicClients.get(net);
	if (!client) {
		client = new SuiGrpcClient({ network: net, baseUrl: `https://fullnode.${net}.sui.io:443` });
		publicClients.set(net, client);
	}
	return client;
}
