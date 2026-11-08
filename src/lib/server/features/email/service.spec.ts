import { describe, expect, it } from 'vitest';
import { reminderEmail } from './service';
import type { Reminder } from '$lib/server/features/reminders/service';

const reminder = (title: string, body: string, actions: unknown[] = []) =>
	({ title, body, actions }) as unknown as Reminder;

describe('reminder email', () => {
	it('uses the first reminder as the subject and escapes text', () => {
		const email = reminderEmail(
			[
				reminder('Chord shapes', 'Mochi: it\'s time for "Chord shapes" <now>', [
					{ action: 'two_minute', label: 'Play one C chord' }
				]),
				reminder('3 to review', 'Mochi: 3 quick questions')
			],
			'https://createthings.example'
		);
		expect(email.subject).toBe('Chord shapes (+1 more)');
		expect(email.html).toContain('&lt;now&gt;');
		expect(email.html).toContain('2-minute start: Play one C chord');
		expect(email.text).toContain('https://createthings.example');
	});
});
