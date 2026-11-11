<script lang="ts">
	import { rise } from '$lib/motion';
	import { shell } from '$lib/shell.svelte';

	/** Design 07, "Feed history (tap the bowl)": why the pet feels this way, and what fed it. */
	let { onclose }: { onclose: () => void } = $props();

	const p = $derived(shell.pet);
	const day = (at: string) =>
		new Date(at).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="catch" role="presentation" onclick={onclose}></div>
<div
	class="card"
	role="dialog"
	aria-label="Feed history"
	in:rise={{ y: 10, scale: 0.97, duration: 220 }}
	out:rise={{ y: 10, scale: 0.97, duration: 150 }}
>
	<div class="lead">{p?.why ?? 'No meals yet.'}</div>
	{#if p?.history.length}
		<div class="list">
			{#each p.history.slice(0, 6) as h, i (h.at + i)}
				<div class="meal">
					<span class="mono">{day(h.at)}</span><span>{h.label}</span><span class="size"
						>{h.size}</span
					>
				</div>
			{/each}
		</div>
	{/if}
	<div class="note">Only real work on Focus items feeds the pet. Saving things never does.</div>
</div>

<style>
	.catch {
		position: fixed;
		inset: 0;
		z-index: 40;
	}
	.card {
		position: fixed;
		z-index: 41;
		inset-inline-start: 16px;
		bottom: 16px;
		width: min(380px, calc(100% - 32px));
		background: #fff;
		border-radius: 20px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		transform-origin: bottom left;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.12);
	}
	.lead {
		font-family: 'Instrument Serif', serif;
		font-size: 22px;
		line-height: 1.2;
	}
	.list {
		display: flex;
		flex-direction: column;
	}
	.meal {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr) auto;
		gap: 10px;
		padding: 10px 0;
		border-top: 1px solid #e4e0d7;
		font-size: 13px;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		color: #5f5a52;
	}
	.size {
		color: oklch(0.45 0.12 145);
	}
	.note {
		font-size: 12px;
		color: #5f5a52;
	}
</style>
