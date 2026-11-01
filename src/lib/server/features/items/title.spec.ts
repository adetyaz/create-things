import { describe, expect, it } from 'vitest';
import { shortTitle, titleKey } from './title';

describe('titles', () => {
	it('keeps the name of a long page title', () => {
		expect(shortTitle('GitHub - MystenLabs/walrus-memory: A portable memory layer')).toBe(
			'GitHub - MystenLabs/walrus-memory'
		);
	});

	it('treats the same title saved twice as one', () => {
		expect(titleKey('Beginner Guitar')).toBe(titleKey('beginner  guitar!'));
		expect(titleKey('Learn Jazz Piano Chords')).not.toBe(
			titleKey('Learn to play jazz piano chords')
		);
	});
});
