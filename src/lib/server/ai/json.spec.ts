import { describe, expect, it } from 'vitest';
import { base64, extractJson } from './json';

describe('extractJson', () => {
	it('reads JSON wrapped in prose and code fences', () => {
		const reply = 'Here you go:\n```json\n{"summary": "A bento grid", "size": "weekend"}\n```';
		expect(extractJson(reply)).toEqual({ summary: 'A bento grid', size: 'weekend' });
	});

	it('passes through an already-parsed object', () => {
		expect(extractJson({ a: 1 })).toEqual({ a: 1 });
	});

	it('fails clearly when there is no JSON', () => {
		expect(() => extractJson('sorry, I cannot help')).toThrow(/no JSON/);
	});
});

describe('base64', () => {
	it('matches the standard encoding', () => {
		expect(base64(new TextEncoder().encode('createthings'))).toBe('Y3JlYXRldGhpbmdz');
	});
});
