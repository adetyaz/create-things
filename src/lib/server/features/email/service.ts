/**
 * Email (needs-input.md): reminders and the weekly digest, in the pet's voice, through Resend.
 * Sent by the hourly cron; each reminder goes out once, on whichever channel shows it first.
 * Until sign-in exists, the only address known is OWNER_EMAIL (for the dev user).
 */
import { eq } from 'drizzle-orm';
import { withDb } from '$lib/server/db';
import { user } from '$lib/server/db/schema/auth';
import { optionalEnv } from '$lib/server/platform/env';
import { DEV_USER_ID } from '$lib/server/platform/user';
import type { Reminder } from '$lib/server/features/reminders/service';

/** Whether email can be sent at all. */
export function emailReady(): boolean {
	return !!optionalEnv('RESEND_API_KEY') && !!optionalEnv('EMAIL_FROM');
}

/** The user's address: their sign-in email, or OWNER_EMAIL for the dev user before sign-in. */
export async function emailFor(platform: App.Platform | undefined, userId: string) {
	const [row] = await withDb(platform, (db) =>
		db.select({ email: user.email }).from(user).where(eq(user.id, userId))
	).catch(() => []);
	if (row?.email) return row.email;
	if (userId === (optionalEnv('DEV_USER_ID') ?? DEV_USER_ID))
		return optionalEnv('OWNER_EMAIL') ?? null;
	return null;
}

const escape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One email for the reminders due now: the first is the subject, each with what to do next. */
export function reminderEmail(reminders: Reminder[], appUrl: string) {
	const subject =
		reminders.length === 1
			? reminders[0].title
			: `${reminders[0].title} (+${reminders.length - 1} more)`;
	const blocks = reminders.map((r) => {
		const actions = (r.actions as { action: string; label: string }[])
			.filter((a) => a.action === 'two_minute')
			.map((a) => `<p style="margin:4px 0;color:#57534e">2-minute start: ${escape(a.label)}</p>`)
			.join('');
		return `<div style="margin:0 0 16px"><p style="margin:0;font-weight:600">${escape(r.title)}</p><p style="margin:4px 0">${escape(r.body)}</p>${actions}</div>`;
	});
	const html = `<!doctype html><body style="font-family:system-ui,sans-serif;font-size:15px;color:#1c1917;max-width:32rem;margin:0 auto;padding:16px">${blocks.join('')}<p><a href="${escape(appUrl)}" style="color:#6d28d9">Open createthings</a></p><p style="color:#a8a29e;font-size:12px">Reminders follow your quiet hours and daily limit. Change them in Settings.</p></body>`;
	const text = `${reminders.map((r) => `${r.title}\n${r.body}`).join('\n\n')}\n\n${appUrl}`;
	return { subject, html, text };
}

/** Sends one email. Returns false (and logs) instead of throwing. */
export async function sendEmail(
	to: string,
	email: { subject: string; html: string; text: string }
) {
	const key = optionalEnv('RESEND_API_KEY');
	const from = optionalEnv('EMAIL_FROM');
	if (!key || !from) return false;
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
		body: JSON.stringify({ from, to, subject: email.subject, html: email.html, text: email.text })
	});
	if (!res.ok) console.error('[email] send failed', res.status, await res.text().catch(() => ''));
	return res.ok;
}
