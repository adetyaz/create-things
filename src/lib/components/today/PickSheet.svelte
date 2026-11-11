<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import { rise } from '$lib/motion';
	import { startThing, START_COST, type StartStage } from '$lib/start';
	import AtLimit from '$lib/components/shared/AtLimit.svelte';

	/**
	 * Pick for me (04 choice chips): how long you have and your energy → one kept thing, why, its
	 * first step, and the memories the pick used. Then Start (makes the plan, puts the first step
	 * on today) or Something else. POST /api/focus/pick (1 credit).
	 */
	let { onclose, onstarted }: { onclose: () => void; onstarted: () => void } = $props();

	const PICK_COST = 1;
	type Pick = {
		item: { id: string; title: string } | null;
		reason: string;
		firstStep: string | null;
		twoMinuteStart: string | null;
		memoriesUsed: { text: string }[];
	};

	let minutes = $state<15 | 30 | 60>(30);
	let energy = $state<'low' | 'normal' | 'high'>('normal');
	let pick = $state<Pick | null>(null);
	let seen = $state<string[]>([]);
	let busy = $state(false);
	let problem = $state<string | null>(null);
	let stage = $state<string | null>(null);
	let limitInfo = $state<{ limit: number; focus: { id: string; title: string }[] } | null>(null);

	async function choose() {
		busy = true;
		problem = null;
		try {
			pick = await api<Pick>('/api/focus/pick', 'POST', { minutes, energy, exclude: seen });
			if (pick.item) seen = [...seen, pick.item.id];
		} catch (e) {
			problem =
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Picking needs ${e.cost ?? PICK_COST} credit, and today's free ones are used up.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}

	async function start() {
		if (!pick?.item) return;
		const labels: Record<StartStage, string> = {
			confirming: 'Starting…',
			starting: 'Starting…',
			planning: 'Making the plan. About a minute.',
			placing: 'Putting the first step on today…'
		};
		const r = await startThing(pick.item.id, (s) => (stage = labels[s]));
		if (r.status === 'planned') {
			onstarted();
			onclose();
		} else if (r.status === 'at_limit') {
			stage = null;
			limitInfo = { limit: r.limit, focus: r.focus };
		} else {
			stage = null;
			problem = r.message;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !stage && onclose()} />

<div class="scrim" role="presentation" onclick={() => !stage && onclose()}></div>
<div class="sheet" role="dialog" aria-label="Pick for me">
	<div
		class="card"
		in:rise={{ y: 12, scale: 0.97, duration: 240 }}
		out:rise={{ y: 12, duration: 160 }}
	>
		<p class="title">Pick for me</p>

		<div class="ask">
			<p class="q">How long do you have?</p>
			<div class="chips">
				{#each [15, 30, 60] as const as m (m)}
					<button
						class="chip"
						class:on={minutes === m}
						aria-pressed={minutes === m}
						onclick={() => (minutes = m)}>{m} min</button
					>
				{/each}
			</div>
		</div>
		<div class="ask">
			<p class="q">Energy?</p>
			<div class="chips">
				{#each [['low', 'Low'], ['normal', 'Okay'], ['high', 'High']] as const as [v, l] (v)}
					<button
						class="chip"
						class:on={energy === v}
						aria-pressed={energy === v}
						onclick={() => (energy = v)}>{l}</button
					>
				{/each}
			</div>
		</div>

		{#if pick}
			<div class="result" in:rise={{ y: 8, duration: 220 }}>
				{#if pick.item}
					<p class="label"><span class="dot"></span>PICKED FOR YOU</p>
					<p class="pick-title">{pick.item.title}</p>
					<p class="why">{pick.reason}</p>
					{#if pick.twoMinuteStart || pick.firstStep}
						<p class="first"><b>Start here:</b> {pick.twoMinuteStart ?? pick.firstStep}</p>
					{/if}
					{#if pick.memoriesUsed.length}
						<div class="cites">
							<span class="mono">BASED ON</span>
							{#each pick.memoriesUsed.slice(0, 3) as m, i (i)}<span class="cite">{m.text}</span
								>{/each}
						</div>
					{/if}
				{:else}
					<p class="why">{pick.reason}</p>
				{/if}
			</div>
		{/if}

		{#if limitInfo}
			<AtLimit
				limit={limitInfo.limit}
				focus={limitInfo.focus}
				onresolved={() => ((limitInfo = null), start())}
			/>
		{:else if stage}
			<p class="stage" role="status">{stage}</p>
		{:else}
			<div class="row">
				{#if pick?.item}
					<button class="btn-ink" onclick={start}>Start · {START_COST} cr</button>
					<button class="btn-quiet" disabled={busy} onclick={choose}
						>Something else · {PICK_COST} cr</button
					>
				{:else}
					<button class="btn-ink" disabled={busy} onclick={choose}
						>{busy ? 'Picking…' : `Pick · ${PICK_COST} cr`}</button
					>
				{/if}
			</div>
		{/if}
		{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
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
		width: min(420px, 100%);
		background: #fff;
		border-radius: 24px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: #1b1a17;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.title {
		font-family: 'Instrument Serif', serif;
		font-size: 32px;
		line-height: 1;
	}
	.ask {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.q {
		font-size: 12px;
		color: #5f5a52;
	}
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	/* 04 choice chips. */
	.chip {
		height: 38px;
		min-width: 76px;
		padding: 0 18px;
		border-radius: 999px;
		background: #fff;
		color: #1b1a17;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 14px;
		font-weight: 500;
		transition-property: scale, background-color, color;
		transition-duration: 150ms;
	}
	.chip.on {
		background: #1b1a17;
		color: #fff;
		box-shadow: none;
	}
	.chip:active {
		scale: 0.96;
	}
	.result {
		padding: 14px 16px;
		border-radius: 16px;
		background: #f6f4ef;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		color: oklch(0.48 0.14 35);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: oklch(0.6 0.15 35);
	}
	.pick-title {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		line-height: 1.15;
	}
	.why,
	.first {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.cites {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.cite {
		border-radius: 999px;
		padding: 3px 9px;
		font-size: 12px;
		background: #fff;
		color: #57534b;
	}
	.row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.btn-ink,
	.btn-quiet {
		height: 38px;
		padding: 0 18px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		background: #1b1a17;
		color: #fff;
	}
	.btn-quiet {
		color: #57534b;
	}
	.btn-ink:active,
	.btn-quiet:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.45;
	}
	.stage {
		font-size: 13px;
		color: #57534b;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
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
			padding-bottom: calc(22px + env(safe-area-inset-bottom));
		}
	}
</style>
