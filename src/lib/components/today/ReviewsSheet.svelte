<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';
	import { shell, feedMoment } from '$lib/shell.svelte';

	/**
	 * Design 11 review card (from the extension popup), opened over Today: one card at a time,
	 * Show answer, then Forgot · Shaky · Got it; "All done. + snack for Biscuit" at the end.
	 * GET /api/reviews, POST /api/reviews/[id] { rating }.
	 */
	let { onclose, onerror }: { onclose: () => void; onerror: (e: unknown) => void } = $props();

	type Card = { id: string; prompt: string; answer: string; itemTitle: string | null };

	let cards = $state<Card[] | null>(null);
	let total = $state(0);
	let done = $state(0);
	let shown = $state(false);
	let busy = $state(false);

	const name = $derived(shell.pet?.pet.name ?? 'your pet');

	async function load() {
		try {
			const r = await api<{ cards: Card[]; dueTotal: number }>('/api/reviews');
			cards = r.cards;
			total = r.cards.length;
			done = 0;
			shown = false;
		} catch (e) {
			onerror(e);
			onclose();
		}
	}
	onMount(load);

	async function rate(card: Card, rating: 'forgot' | 'shaky' | 'got_it') {
		if (busy) return;
		busy = true;
		try {
			await api(`/api/reviews/${card.id}`, 'POST', { rating });
			cards = (cards ?? []).filter((c) => c.id !== card.id);
			done += 1;
			shown = false;
			if (!cards.length) feedMoment();
		} catch (e) {
			onerror(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-label="Reviews">
	<div
		class="card"
		in:rise={{ y: 12, scale: 0.97, duration: 240 }}
		out:rise={{ y: 12, scale: 0.97, duration: 160 }}
	>
		{#if cards === null}
			<div class="row"><span class="head">Reviews</span><span class="meta">…</span></div>
		{:else if cards.length}
			{@const card = cards[0]}
			<div class="row">
				<span class="head">Review {done + 1} of {total}</span>
				<span class="meta">{cards.length} left</span>
			</div>
			{#key card.id}
				<div class="body" in:rise={{ x: 16, duration: 200 }}>
					<div class="q">{card.prompt}</div>
					{#if card.itemTitle}<div class="meta">{card.itemTitle}</div>{/if}
					{#if shown}
						<div class="a" in:rise={{ y: 4, duration: 180 }}>{card.answer}</div>
						<div class="grades">
							<button class="grade" disabled={busy} onclick={() => rate(card, 'forgot')}
								>Forgot</button
							>
							<button class="grade" disabled={busy} onclick={() => rate(card, 'shaky')}
								>Shaky</button
							>
							<button class="grade ink" disabled={busy} onclick={() => rate(card, 'got_it')}
								>Got it</button
							>
						</div>
					{:else}
						<button class="show" onclick={() => (shown = true)}>Show answer</button>
					{/if}
				</div>
			{/key}
		{:else if done}
			<div class="end">
				<span class="fed">All done. + snack for {name}</span>
				<button class="again" onclick={onclose}>Back to today</button>
			</div>
		{:else}
			<div class="end">
				<span class="meta"
					>No reviews due. Cards come from what you journal and the quizzes you take.</span
				>
				<button class="again" onclick={onclose}>Back to today</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(27, 26, 23, 0.18);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.sheet {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		pointer-events: none;
	}
	.card {
		pointer-events: auto;
		width: min(380px, 100%);
		background: #fff;
		border-radius: 20px;
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.head {
		font-size: 13px;
		font-weight: 600;
	}
	.meta {
		font-size: 12px;
		color: #5f5a52;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.q {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		line-height: 1.2;
	}
	.a {
		font-size: 14px;
		line-height: 1.5;
		color: #57534b;
	}
	.grades {
		display: flex;
		gap: 6px;
	}
	.grade {
		flex: 1;
		height: 32px;
		border-radius: 999px;
		background: #efece5;
		font-size: 13px;
		font-weight: 500;
		color: #1b1a17;
	}
	.grade.ink,
	.show {
		background: #1b1a17;
		color: #fff;
	}
	.show {
		align-self: flex-start;
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
	}
	.end {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.fed {
		font-size: 14px;
		color: oklch(0.4 0.1 145);
	}
	.again {
		align-self: flex-start;
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		background: #efece5;
		font-size: 13px;
		font-weight: 500;
	}
	button {
		transition: transform var(--dur-press) var(--ease-out);
	}
	button:active {
		transform: scale(0.96);
	}
	button:disabled {
		opacity: 0.5;
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	@media (max-width: 640px) {
		.sheet {
			align-items: flex-end;
			padding: 0;
		}
		.card {
			width: 100%;
			border-radius: 24px 24px 0 0;
			padding-bottom: calc(20px + env(safe-area-inset-bottom));
		}
	}
</style>
