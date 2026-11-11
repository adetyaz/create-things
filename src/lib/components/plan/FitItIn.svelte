<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';

	/**
	 * Fit it in: a new idea mid-plan. Walrus `embed` finds the goal it belongs to by meaning, and
	 * the pet offers ways to fit it without starting a new pile: add it as a step to that goal,
	 * swap it into a block, park it for later, or keep it as a 5-minute note.
	 * POST /api/plan/fit { itemId }, PUT /api/plan/fit { itemId, choice, relatedItemId?, parkUntil? }.
	 */
	let { itemId, onapplied }: { itemId: string; onapplied: (message: string) => void } = $props();

	type Offer = {
		choice: 'add_step' | 'swap' | 'park' | 'note';
		label: string;
		relatedItemId?: string;
		parkUntil?: string;
	};
	type Proposal = {
		related: { id: string; title: string; score: number } | null;
		candidates: { id: string; title: string; score: number | null }[];
		offers: Offer[];
	};

	let proposal = $state<Proposal | null>(null);
	let busy = $state(false);
	let problem = $state<string | null>(null);

	onMount(async () => {
		try {
			proposal = await api<Proposal>('/api/plan/fit', 'POST', { itemId });
		} catch (e) {
			problem = e instanceof Error ? e.message : 'Could not work out where it fits.';
		}
	});

	async function apply(o: Offer) {
		busy = true;
		problem = null;
		try {
			const r = await api<{ choice: string; day?: string; parkUntil?: string }>(
				'/api/plan/fit',
				'PUT',
				{
					itemId,
					choice: o.choice,
					relatedItemId: o.relatedItemId,
					parkUntil: o.parkUntil
				}
			);
			onapplied(
				r.choice === 'add_step'
					? `Added as a step to “${proposal?.related?.title ?? 'your goal'}”.`
					: r.choice === 'swap'
						? `Swapped into your plan${r.day ? ` on ${r.day}` : ''}.`
						: r.choice === 'park'
							? `Parked until ${r.parkUntil ?? 'later'}. It won't distract you before then.`
							: 'Kept as a 5-minute note in your journal.'
			);
		} catch (e) {
			problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="fit">
	<div class="head">
		<p class="strong">Fit it into what you're doing</p>
	</div>
	{#if !proposal && !problem}
		<p class="muted">Finding the goal it belongs to…</p>
	{:else if proposal}
		<p class="muted" in:rise={{ y: 4, duration: 200 }}>
			{#if proposal.related}
				This sounds like part of <b>{proposal.related.title}</b>. Instead of starting a new pile:
			{:else}
				It doesn't belong to anything you're working on. You can park it or keep a note:
			{/if}
		</p>
		<div class="offers">
			{#each proposal.offers as o (o.choice)}
				<button class="offer" disabled={busy} onclick={() => apply(o)}>{o.label}</button>
			{/each}
		</div>
	{/if}
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</div>

<style>
	.fit {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 18px;
		border-radius: 16px;
		background: #fff;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px 12px;
	}
	.strong {
		font-size: 15px;
		font-weight: 600;
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.offers {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.offer {
		text-align: start;
		padding: 10px 14px;
		border-radius: 12px;
		background: #f6f4ef;
		font-size: 14px;
		line-height: 1.4;
		transition-property: scale, background-color;
		transition-duration: 150ms;
	}
	.offer:hover {
		background: #efece5;
	}
	.offer:active {
		scale: 0.98;
	}
	.offer:disabled {
		opacity: 0.5;
	}
	.offer:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
</style>
