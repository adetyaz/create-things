/**
 * Encrypts connected-account tokens at rest (AES-GCM, key from SOURCE_TOKEN_KEY: 32 random bytes,
 * base64). Tokens are never returned by the API.
 */
import { requiredEnv } from '$lib/server/platform/env';

function bytesOf(b64: string): Uint8Array<ArrayBuffer> {
	const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
	const out = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

export function base64url(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function key(): Promise<CryptoKey> {
	const raw = bytesOf(requiredEnv('SOURCE_TOKEN_KEY'));
	if (raw.length !== 32) throw new Error('SOURCE_TOKEN_KEY must be 32 bytes, base64');
	return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(text: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		await key(),
		new TextEncoder().encode(text)
	);
	return `${base64url(iv)}.${base64url(new Uint8Array(data))}`;
}

export async function decrypt(sealed: string): Promise<string> {
	const [iv, data] = sealed.split('.');
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: bytesOf(iv) },
		await key(),
		bytesOf(data)
	);
	return new TextDecoder().decode(plain);
}

/** A random URL-safe string (PKCE verifier, OAuth state). */
export function randomToken(bytes = 32): string {
	return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** PKCE S256 challenge for a verifier. */
export async function challengeOf(verifier: string): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	return base64url(new Uint8Array(hash));
}
