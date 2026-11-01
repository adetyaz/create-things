import { describe, expect, it } from 'vitest';
import { readVoice, voicePrompt } from './prompt';

describe('voicePrompt', () => {
	it('asks for a transcript only when there is none yet', () => {
		expect(voicePrompt({ transcript: null, known: [] })).toContain('"transcript"');
		expect(voicePrompt({ transcript: 'learn japanese', known: ['Jazz piano'] })).not.toContain(
			'"transcript"'
		);
	});

	it('lists what a step could belong to, one per line', () => {
		expect(voicePrompt({ transcript: 'x', known: ['Jazz piano', 'Pottery'] })).toContain(
			'- Jazz piano\n- Pottery'
		);
	});
});

describe('readVoice', () => {
	it('keeps ideas, defaults unknown kinds and keeps a given transcript', () => {
		const result = readVoice(
			{
				transcript: 'from the model',
				ideas: [
					{ title: 'Lo-fi beat', text: 'Make a lo-fi beat this weekend', kind: 'new_item' },
					{ title: 'ii-V-I in F', text: 'Practise it', kind: 'step', forItem: 'jazz piano' },
					{ title: 'Odd', text: 'x', kind: 'dream' },
					{ title: '', text: '' }
				]
			},
			'from whisper',
			['Jazz piano']
		);
		expect(result.transcript).toBe('from whisper');
		expect(result.ideas.map((i) => [i.kind, i.forItem])).toEqual([
			['new_item', null],
			['step', 'Jazz piano'],
			['new_item', null]
		]);
	});

	it('turns a step for something they do not have into a new item', () => {
		const result = readVoice(
			{ ideas: [{ title: 'ii-V-I', text: 'Practise it', kind: 'step', forItem: 'Pottery' }] },
			'x',
			['Jazz piano']
		);
		expect(result.ideas[0]).toMatchObject({ kind: 'new_item', forItem: null });
	});
});
