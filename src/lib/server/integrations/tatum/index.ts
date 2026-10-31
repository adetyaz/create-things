import { requiredEnv } from '$lib/server/platform/env';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { TatumGrpcTransport } from './transport';

export type SuiNetwork = 'mainnet' | 'testnet';

const clients = new Map<SuiNetwork, SuiGrpcClient>();

function apiKey(): string {
	return requiredEnv('TATUM_API_KEY');
}

/** Sui client that reads chain data through Tatum's Sui gRPC gateway. Server-only. */
export function suiClient(network: SuiNetwork = 'mainnet'): SuiGrpcClient {
	let client = clients.get(network);
	if (!client) {
		client = new SuiGrpcClient({
			network,
			transport: new TatumGrpcTransport({
				baseUrl: `https://sui-${network}-grpc.gateway.tatum.io`,
				apiKey: apiKey()
			})
		});
		clients.set(network, client);
	}
	return client;
}

export interface ExchangeRate {
	symbol: string;
	basePair: string;
	value: number;
	source: string;
	timestamp: number;
}

/** Live exchange rate from Tatum's Data API, e.g. SUI → USD. */
export async function getExchangeRate(symbol = 'SUI', basePair = 'USD'): Promise<ExchangeRate> {
	const url = `https://api.tatum.io/v4/data/rate/symbol?symbol=${encodeURIComponent(symbol)}&basePair=${encodeURIComponent(basePair)}`;
	const res = await fetch(url, { headers: { 'x-api-key': apiKey() } });
	if (!res.ok) throw new Error(`Tatum rate request failed with HTTP ${res.status}`);

	const body = (await res.json()) as {
		value: string;
		basePair: string;
		source: string;
		timestamp: number;
		symbol: string;
	};
	const value = Number(body.value);
	if (!Number.isFinite(value) || value <= 0)
		throw new Error(`Tatum returned an unusable rate: ${body.value}`);

	return {
		symbol: body.symbol,
		basePair: body.basePair,
		value,
		source: body.source,
		timestamp: body.timestamp
	};
}
