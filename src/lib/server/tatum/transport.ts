import {
	RpcError,
	UnaryCall,
	mergeRpcOptions,
	type MethodInfo,
	type RpcMetadata,
	type RpcOptions,
	type RpcStatus,
	type RpcTransport,
	type ServerStreamingCall,
	type ClientStreamingCall,
	type DuplexStreamingCall
} from '@protobuf-ts/runtime-rpc';

const GRPC_CODES = [
	'OK',
	'CANCELLED',
	'UNKNOWN',
	'INVALID_ARGUMENT',
	'DEADLINE_EXCEEDED',
	'NOT_FOUND',
	'ALREADY_EXISTS',
	'PERMISSION_DENIED',
	'RESOURCE_EXHAUSTED',
	'FAILED_PRECONDITION',
	'ABORTED',
	'OUT_OF_RANGE',
	'UNIMPLEMENTED',
	'INTERNAL',
	'UNAVAILABLE',
	'DATA_LOSS',
	'UNAUTHENTICATED'
];

export interface TatumGrpcTransportOptions {
	/** e.g. https://sui-mainnet-grpc.gateway.tatum.io */
	baseUrl: string;
	apiKey: string;
	timeoutMs?: number;
}

/**
 * Unary gRPC over plain `fetch`, so the Sui SDK can talk to Tatum's gateway from a Worker.
 *
 * Tatum's gateway speaks native gRPC (not gRPC-web) but answers HTTP/1.1 requests with normal
 * gRPC message frames. Workers can't read HTTP trailers, so a call counts as OK when a message
 * frame arrives and no `grpc-status` error is sent in the headers or as a trailer frame.
 */
export class TatumGrpcTransport implements RpcTransport {
	constructor(private readonly options: TatumGrpcTransportOptions) {}

	mergeOptions(options?: Partial<RpcOptions>): RpcOptions {
		return mergeRpcOptions({}, options);
	}

	unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions
	): UnaryCall<I, O> {
		const url = `${this.options.baseUrl}/${method.service.typeName}/${method.name}`;
		const response = this.send(url, method.I.toBinary(input, options.binaryOptions), options);

		return new UnaryCall<I, O>(
			method,
			options.meta ?? {},
			input,
			response.then((r) => r.headers),
			response.then((r) => method.O.fromBinary(r.payload, options.binaryOptions)),
			response.then((): RpcStatus => ({ code: 'OK', detail: '' })),
			response.then((r) => r.trailers)
		);
	}

	serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>
	): ServerStreamingCall<I, O> {
		throw new RpcError(`${method.name}: streaming is not supported`, 'UNIMPLEMENTED');
	}

	clientStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>
	): ClientStreamingCall<I, O> {
		throw new RpcError(`${method.name}: streaming is not supported`, 'UNIMPLEMENTED');
	}

	duplex<I extends object, O extends object>(method: MethodInfo<I, O>): DuplexStreamingCall<I, O> {
		throw new RpcError(`${method.name}: streaming is not supported`, 'UNIMPLEMENTED');
	}

	private async send(url: string, message: Uint8Array, options: RpcOptions) {
		const body = new Uint8Array(5 + message.length);
		new DataView(body.buffer).setUint32(1, message.length);
		body.set(message, 5);

		const headers: Record<string, string> = {
			'content-type': 'application/grpc',
			te: 'trailers',
			'x-api-key': this.options.apiKey
		};
		for (const [key, value] of Object.entries(options.meta ?? {})) {
			if (typeof value === 'string') headers[key] = value;
		}

		const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 15_000);
		const signal = options.abort ? AbortSignal.any([options.abort, timeout]) : timeout;

		const res = await fetch(url, { method: 'POST', headers, body, signal });
		if (res.status === 429) {
			throw new RpcError('Tatum rate limit reached', 'RESOURCE_EXHAUSTED');
		}
		if (!res.ok) {
			throw new RpcError(`Tatum gateway returned HTTP ${res.status}`, 'UNAVAILABLE');
		}

		const responseHeaders: RpcMetadata = {};
		res.headers.forEach((value, key) => (responseHeaders[key] = value));
		throwOnGrpcStatus(res.headers.get('grpc-status'), res.headers.get('grpc-message'));

		const frames = new Uint8Array(await res.arrayBuffer());
		const view = new DataView(frames.buffer, frames.byteOffset, frames.byteLength);
		const trailers: RpcMetadata = {};
		let payload: Uint8Array | undefined;

		for (let offset = 0; offset + 5 <= frames.length; ) {
			const flag = frames[offset];
			const length = view.getUint32(offset + 1);
			const data = frames.subarray(offset + 5, offset + 5 + length);
			offset += 5 + length;

			if (flag & 0x80) {
				for (const line of new TextDecoder().decode(data).split('\r\n')) {
					const at = line.indexOf(':');
					if (at > 0) trailers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
				}
			} else if (flag & 0x01) {
				throw new RpcError('Compressed gRPC responses are not supported', 'INTERNAL');
			} else {
				payload ??= data;
			}
		}

		throwOnGrpcStatus(trailers['grpc-status'] as string, trailers['grpc-message'] as string);
		if (!payload) throw new RpcError('Tatum gateway sent no gRPC message', 'INTERNAL');

		return { payload, headers: responseHeaders, trailers };
	}
}

function throwOnGrpcStatus(status: string | null | undefined, message: string | null | undefined) {
	if (!status || status === '0') return;
	const code = GRPC_CODES[Number(status)] ?? 'UNKNOWN';
	throw new RpcError(message ? decodeURIComponent(message) : `gRPC status ${status}`, code);
}
