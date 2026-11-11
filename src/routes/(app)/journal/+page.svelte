<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { rise, reduced } from '$lib/motion';
	import { feedMoment, shell } from '$lib/shell.svelte';

	/**
	 * Journal. Not drawn in the design system, so it is built from its parts: the 04 "Anything you
	 * learned?" box to write (writing is the main thing here, so it comes first), the 07 feed
	 * toast when an entry feeds the pet, and past entries as quiet white cards grouped by day.
	 * GET/POST /api/journal.
	 */

	type Entry = {
		id: string;
		kind: 'entry' | 'check_in';
		body: string;
		source: string;
		fed: 'snack' | 'meal' | 'feast' | null;
		createdAt: string;
	};
	type Fed = { status: 'fed' | 'full'; name?: string; size?: string } | null;

	let entries = $state<Entry[] | null>(null);
	let problem = $state<string | null>(null);
	let body = $state('');
	let saving = $state(false);
	let toast = $state<{ fed: boolean; text: string } | null>(null);
	const reduce = reduced();

	const SOURCE: Record<string, string> = {
		manual: 'Entry',
		check_in: 'Check-in',
		pomodoro: 'After a focus session',
		voice: 'Said out loud'
	};

	const days = $derived.by(() => {
		const out: { label: string; items: Entry[] }[] = [];
		for (const e of entries ?? []) {
			const label = new Date(e.createdAt)
				.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
				.toUpperCase();
			const last = out.at(-1);
			if (last?.label === label) last.items.push(e);
			else out.push({ label, items: [e] });
		}
		return out;
	});

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=/journal`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			entries = (await api<{ entries: Entry[] }>('/api/journal?limit=60')).entries;
		} catch (e) {
			failed(e);
		}
	}
	onMount(load);

	async function save() {
		const text = body.trim();
		if (!text || saving) return;
		saving = true;
		try {
			const r = await api<{ entry: Entry; fed: Fed; about: { title: string } | null }>(
				'/api/journal',
				'POST',
				{ kind: 'entry', body: text }
			);
			body = '';
			entries = [r.entry, ...(entries ?? [])];
			if (r.fed?.status === 'fed') {
				toast = { fed: true, text: `+ ${r.fed.size ?? 'snack'} for ${r.fed.name ?? 'your pet'}` };
				feedMoment();
			} else {
				toast = {
					fed: false,
					text: r.about
						? `Saved, about "${r.about.title}".`
						: 'Saved. Only work on a Focus item feeds the pet.'
				};
			}
			setTimeout(() => (toast = null), 3200);
		} catch (e) {
			failed(e);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Journal · createthings</title>
</svelte:head>

<main class="page">
	<header class="head">
		<span class="label">{shell.pet ? `${shell.pet.pet.name} reads it` : 'Yours'}</span>
		<h1 class="title">Journal</h1>
	</header>

	<!-- 04: "Anything you learned? optional" -->
	<section class="write" aria-label="Write an entry">
		<label class="ask" for="entry">What did you do or learn?</label>
		<textarea
			id="entry"
			bind:value={body}
			rows="3"
			maxlength="10000"
			placeholder="Shell voicings are just the 3rd and 7th"
			onkeydown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && save()}
		></textarea>
		<div class="write-foot">
			<span class="hint"
				>Writing about something you're working on feeds {shell.pet?.pet.name ?? 'your pet'}.</span
			>
			<button class="btn-ink" disabled={saving || !body.trim()} onclick={save}>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
		{#if toast}
			<div
				class="toast"
				class:fed={toast.fed}
				role="status"
				in:rise={{ y: 6, duration: 200 }}
				out:rise={{ y: 4, duration: 150 }}
			>
				{toast.text}
			</div>
		{/if}
	</section>

	<!-- Past entries, newest first, by day -->
	<section class="past" aria-label="Past entries">
		{#if problem}
			<div class="state">
				<p>{problem}</p>
				<button class="btn-soft" onclick={load}>Try again</button>
			</div>
		{:else if entries === null}
			<div class="skeleton"></div>
			<div class="skeleton short"></div>
		{:else if !entries.length}
			<div class="state">
				<p class="empty-title">Nothing here yet.</p>
				<p class="hint">
					Write a line about what you did today. It's how {shell.pet?.pet.name ?? 'your pet'} remembers.
				</p>
			</div>
		{:else}
			{#each days as d, di (d.label)}
				<div class="day" in:rise={{ y: 8, delay: reduce ? 0 : Math.min(di * 60, 300) }}>
					<div class="day-label">{d.label}</div>
					{#each d.items as e (e.id)}
						<article class="entry">
							<p class="body">{e.body}</p>
							<div class="meta">
								<span>{SOURCE[e.kind === 'check_in' ? 'check_in' : e.source] ?? 'Entry'}</span>
								<span
									>{new Date(e.createdAt).toLocaleTimeString(undefined, {
										hour: '2-digit',
										minute: '2-digit'
									})}</span
								>
								{#if e.fed}<span class="fed-tag">{e.fed}</span>{/if}
							</div>
						</article>
					{/each}
				</div>
			{/each}
		{/if}
	</section>
</main>

<style>
	/* A paper sheet on the sky (design 10 frame), with the pet's dusty edge (13). */
	.page {
		max-width: 720px;
		margin: 24px auto 48px;
		width: calc(100% - 32px);
		padding: 32px clamp(16px, 4vw, 40px) 40px;
		border-radius: 24px;
		background-color: #f6f4ef;
		background-image: radial-gradient(#ddd8cd 1px, transparent 1px);
		background-size: 22px 22px;
		box-shadow:
			inset 0 0 0 1px #e4e0d7,
			var(--dusty-edge, 0 0 0 transparent),
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
		display: flex;
		flex-direction: column;
		gap: 32px;
		color: #1b1a17;
	}
	/* 16B heading pattern: small label above a serif title. */
	.head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.label {
		font-size: 12px;
		color: #5f5a52;
	}
	.title {
		font-family: 'Instrument Serif', serif;
		font-size: 44px;
		font-weight: 400;
		line-height: 1;
		letter-spacing: -0.01em;
	}
	/* Concentric: card radius 20 = textarea 14 + padding 6. */
	.write {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ask {
		font-size: 12px;
		color: #5f5a52;
	}
	textarea {
		min-height: 96px;
		padding: 12px 14px;
		background: #fff;
		border-radius: 14px;
		box-shadow: 0 0 0 1px #e4e0d7;
		font: inherit;
		font-size: 15px;
		line-height: 1.5;
		color: #1b1a17;
		resize: vertical;
		outline: none;
		transition-property: box-shadow;
		transition-duration: 150ms;
	}
	textarea:focus-visible {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	textarea::placeholder {
		color: #8a847a;
	}
	.write-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.hint {
		font-size: 12px;
		line-height: 1.45;
		color: #5f5a52;
	}
	.btn-ink {
		flex: none;
		height: 38px;
		padding: 0 20px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		transition-property: scale, background-color;
		transition-duration: 150ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
	.btn-ink:active {
		scale: 0.96;
	}
	.btn-ink:disabled {
		opacity: 0.45;
	}
	.btn-soft {
		height: 34px;
		padding: 0 16px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 13px;
		font-weight: 500;
	}
	/* 07 feed toast. */
	.toast {
		padding: 10px 14px;
		border-radius: 14px;
		font-size: 13px;
		color: #57534b;
		background: #efece5;
	}
	.toast.fed {
		font-weight: 600;
		color: oklch(0.38 0.1 145);
		background: oklch(0.95 0.03 145);
	}
	.past {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.day {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.day-label {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	/* 05 card surface at rest depth. */
	.entry {
		padding: 14px 16px;
		background: #fff;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.06);
	}
	.body {
		font-size: 15px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		font-size: 12px;
		color: #5f5a52;
	}
	.fed-tag {
		color: oklch(0.45 0.12 145);
	}
	.state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		font-size: 14px;
		color: #57534b;
	}
	.empty-title {
		font-family: 'Instrument Serif', serif;
		font-size: 28px;
		color: #1b1a17;
	}
	.skeleton {
		height: 72px;
		border-radius: 16px;
		background: #efece5;
	}
	.skeleton.short {
		height: 48px;
		width: 70%;
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
</style>
