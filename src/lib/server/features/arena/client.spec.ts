import { describe, expect, it } from 'vitest';
import { blockToSave } from './client';

describe('Are.na blocks', () => {
	it('maps each kind of block to something to save', () => {
		expect(
			blockToSave({
				id: 1,
				type: 'Link',
				title: 'Riso guide',
				source: { url: 'https://riso.example/guide' }
			})
		).toMatchObject({ url: 'https://riso.example/guide', externalId: '1', title: 'Riso guide' });
		expect(
			blockToSave({ id: 2, type: 'Text', content: { plain: 'Two-colour, lots of grain' } })
		).toMatchObject({ url: 'https://www.are.na/block/2', text: 'Two-colour, lots of grain' });
		expect(
			blockToSave({ id: 3, type: 'Image', image: { large: { url: 'https://img.example/3.jpg' } } })
		).toMatchObject({ url: 'https://www.are.na/block/3', image: 'https://img.example/3.jpg' });
	});
});
