<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';
	import { shell, ROOM, PET_STATE } from '$lib/shell.svelte';
	import CheckIn from './CheckIn.svelte';

	/**
	 * Design 07, "Actions · Level 2 (tap the pet)": the pet's name and mood, then what you can do
	 * with it. Rows lead to real places only.
	 */
	let { onclose }: { onclose: () => void } = $props();

	let reviewsDue = $state<number | null>(null);
	let checking = $state(false);

	const p = $derived(shell.pet);
	const petState = $derived(p ? (PET_STATE[p.mood] ?? 'happy') : 'egg');
	const room = $derived(ROOM[petState] ?? ROOM.happy);
	const moodLine = $derived(
		p
			? `${p.mood === 'ran_away' ? 'Ran away' : p.mood[0].toUpperCase() + p.mood.slice(1)} · ${p.today.eaten ? 'fed today' : 'not fed today'}`
			: ''
	);

	onMount(() => {
		api<{ dueTotal: number }>('/api/reviews').then(
			(r) => (reviewsDue = r.dueTotal),
			() => {}
		);
	});

	function go(path: '/today', query: string) {
		onclose();
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
		goto(`${resolve(path)}?${query}`);
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="catch" role="presentation" onclick={onclose}></div>
<div
	class="card"
	role="dialog"
	aria-label="Your pet"
	in:rise={{ y: -6, scale: 0.96, duration: 200 }}
	out:rise={{ y: -6, scale: 0.96, duration: 140 }}
>
	{#if p}
		<div class="head">
			<div class="name">{p.pet.name}</div>
			<div class="mood"><span class="dot" style:background={room.dot}></span>{moodLine}</div>
		</div>
		<button class="row" onclick={() => go('/today', 'focus=1')}>
			<span>Start a pomodoro</span><span class="mono">25:00</span>
		</button>
		{#if checking}
			<div class="inline" in:rise={{ y: 4, duration: 180 }}>
				<CheckIn autofocus ondone={onclose} />
			</div>
		{:else}
			<button class="row" onclick={() => (checking = true)}>
				<span>Log a 5-minute check-in</span><span class="snack">snack</span>
			</button>
		{/if}
		<button class="row" onclick={() => go('/today', 'pick=1')}>
			<span>Pick my focus</span><span class="mono">1 cr</span>
		</button>
		<button class="row" onclick={() => go('/today', 'reviews=1')}>
			<span>Open reviews</span><span class="mono"
				>{reviewsDue === null ? '…' : `${reviewsDue} due`}</span
			>
		</button>
		<a class="row talk" href={resolve('/talk')} onclick={onclose}>
			<span>Talk to me</span><span class="mono light">1 cr / message</span>
		</a>
		<a class="row" href={resolve('/memories')} onclick={onclose}>
			<span>What I know about you</span><span class="mono">→</span>
		</a>
	{:else}
		<div class="head"><div class="name">No pet yet</div></div>
		<a class="row" href={resolve('/start')}
			><span>Meet your pet</span><span class="mono">2 min</span></a
		>
	{/if}
</div>

<style>
	.catch {
		position: fixed;
		inset: 0;
		z-index: 49;
	}
	/* 07: white, radius 24, open depth. */
	.card {
		position: fixed;
		z-index: 50;
		top: max(calc(var(--strip-h, 0px) - 8px), 64px);
		inset-inline-start: 16px;
		width: min(320px, calc(100% - 32px));
		background: #fff;
		border-radius: 24px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		transform-origin: top left;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.12);
	}
	.head {
		padding: 12px 16px 14px;
		margin-bottom: 4px;
		border-bottom: 1px solid #efece5;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.name {
		font-size: 14px;
		font-weight: 600;
	}
	.mood {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #57534b;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 48px;
		padding: 12px 16px;
		border-radius: 14px;
		font-size: 14px;
		text-align: start;
		color: #1b1a17;
		transition:
			background-color var(--dur-press) var(--ease-out),
			transform var(--dur-press) var(--ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.row:hover {
			background: #f6f4ef;
		}
	}
	.row:active {
		transform: scale(0.98);
		background: #f6f4ef;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	/* 07: "Talk to me" is the one ink row. */
	.row.talk {
		background: #1b1a17;
		color: #fff;
		margin-top: 6px;
	}
	.light {
		color: #b8b2a6;
	}
	.snack {
		font-size: 12px;
		color: oklch(0.45 0.12 145);
	}
	.inline {
		padding: 6px 8px;
	}
	.row:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: -2px;
	}
</style>
