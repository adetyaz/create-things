<script lang="ts">
	import { setFocusLimit, pauseThing } from '$lib/start';

	/**
	 * Starting more than you work on at once: say so plainly (Cal Newport, "do fewer things") and
	 * offer the two ways forward: pause one of the current things, or allow one more at a time.
	 * After either, `onresolved` retries the start.
	 */
	let {
		limit,
		focus,
		onresolved
	}: { limit: number; focus: { id: string; title: string }[]; onresolved: () => void } = $props();

	let busy = $state(false);
	let problem = $state<string | null>(null);

	async function run(work: () => Promise<void>) {
		busy = true;
		problem = null;
		try {
			await work();
			onresolved();
		} catch (e) {
			problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="limit">
	<p class="strong">
		You work on {limit}
		{limit === 1 ? 'thing' : 'things'} at a time{focus.length
			? `: ${focus.map((f) => `“${f.title}”`).join(', ')}`
			: ''}.
	</p>
	<p class="muted">
		Fewer things at once means each one actually moves. Make room, or allow one more.
	</p>
	<div class="row">
		{#each focus.slice(0, 2) as f (f.id)}
			<button class="btn-white" disabled={busy} onclick={() => run(() => pauseThing(f.id))}
				>Pause “{f.title}”</button
			>
		{/each}
		{#if limit < 3}
			<button class="btn-ink" disabled={busy} onclick={() => run(() => setFocusLimit(limit + 1))}
				>Allow {limit + 1} at once</button
			>
		{/if}
	</div>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</div>

<style>
	.limit {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.strong {
		font-size: 15px;
		font-weight: 600;
		line-height: 1.35;
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.btn-ink,
	.btn-white {
		height: 34px;
		padding: 0 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		background: #1b1a17;
		color: #fff;
	}
	.btn-white {
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.btn-ink:active,
	.btn-white:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.5;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
</style>
