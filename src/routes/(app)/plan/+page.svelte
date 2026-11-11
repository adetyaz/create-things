<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { rise, reduced } from '$lib/motion';
	import { feedMoment, shell } from '$lib/shell.svelte';
	import WeekPlanner from '$lib/components/plan/WeekPlanner.svelte';

	/**
	 * Plan. Not drawn as a page in the design system, so it is built from its parts: the 16B
	 * heading and tab pill (Today · Tomorrow, with counts), the 05 BLOCK states as the rows
	 * (Today's #1, Planned, Done · fed, Moved · Place it) and the design 13 prompt
	 * "N blocks moved? Let's place them." GET /api/plan/day, GET/POST /api/plan/reshuffle,
	 * POST /api/steps/[id]/complete.
	 */

	type Block = {
		slotId: string;
		startTime: string | null;
		anchor: string | null;
		place: string | null;
		missed: boolean;
		intention: string;
		step: { id: string; title: string; minutes: number; done: boolean };
		item: { id: string; title: string };
	};
	type Day = { day: string; blocks: Block[]; first: Block | null };
	type Missed = Block & {
		day: string;
		suggestion: {
			day: string;
			startTime?: string | null;
			anchor?: string | null;
			place?: string | null;
		};
	};
	type Reshuffle = {
		missed: Missed[];
		neverMissTwice: { slotId: string; stepTitle: string; message: string } | null;
	};

	let tab = $state<'today' | 'tomorrow' | 'week' | 'wrap'>('today');

	/** Daily shutdown: done today, what moves, tomorrow's top 3 (Ivy Lee). */
	type Shutdown = {
		due: boolean;
		shutdownTime: string;
		done: string[];
		moves: (Block & {
			suggestion: {
				day: string;
				startTime: string | null;
				anchor: string | null;
				place: string | null;
			};
		})[];
		tomorrow: { stepId: string; title: string; itemTitle: string; twoMinute: string | null }[];
	};
	let shutdown = $state<Shutdown | null>(null);
	let picked = $state<string[]>([]);
	let dayNote = $state('');
	let wrapped = $state<string | null>(null);

	async function loadShutdown() {
		try {
			shutdown = await api<Shutdown>('/api/plan/shutdown');
			picked = shutdown.tomorrow.slice(0, 3).map((t) => t.stepId);
		} catch {
			shutdown = null;
		}
	}
	function togglePick(id: string) {
		picked = picked.includes(id)
			? picked.filter((p) => p !== id)
			: picked.length < 3
				? [...picked, id]
				: picked;
	}
	async function wrapUp() {
		if (!shutdown || busy) return;
		busy = true;
		try {
			await api('/api/plan/shutdown', 'POST', {
				moves: shutdown.moves.map((m) => ({ slotId: m.slotId, ...m.suggestion })),
				drop: [],
				tomorrow: picked,
				note: dayNote.trim() || undefined
			});
			const first = shutdown.tomorrow.find((t) => t.stepId === picked[0]);
			wrapped = first ? `Tomorrow's #1: ${first.title}` : 'Day wrapped up.';
			dayNote = '';
			await load();
			await loadShutdown();
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}
	let today = $state<Day | null>(null);
	let tomorrow = $state<Day | null>(null);
	let reshuffle = $state<Reshuffle | null>(null);
	let problem = $state<string | null>(null);
	let busy = $state(false);
	const reduce = reduced();

	const view = $derived(tab === 'today' ? today : tomorrow);
	const tomorrowDate = () => {
		const d = new Date(Date.now() + 864e5);
		return d.toISOString().slice(0, 10);
	};
	const when = (b: Block) =>
		[b.startTime ? b.startTime.slice(0, 5) : b.anchor, b.place].filter(Boolean).join(' · ');

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=/plan`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			const [t, n, r] = await Promise.all([
				api<Day>('/api/plan/day'),
				api<Day>(`/api/plan/day?date=${tomorrowDate()}`).catch(() => null),
				api<Reshuffle>('/api/plan/reshuffle').catch(() => null)
			]);
			today = t;
			tomorrow = n;
			reshuffle = r;
		} catch (e) {
			failed(e);
		}
	}
	onMount(() => {
		void load();
		void loadShutdown();
		const q = new URL(location.href).searchParams;
		if (q.has('wrap')) tab = 'wrap';
		if (q.has('week')) tab = 'week';
	});

	async function placeAll() {
		if (!reshuffle?.missed.length || busy) return;
		busy = true;
		try {
			await api('/api/plan/reshuffle', 'POST', {
				moves: reshuffle.missed.map((m) => ({ slotId: m.slotId, ...m.suggestion })),
				drop: []
			});
			await load();
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}
	async function placeOne(m: Missed) {
		busy = true;
		try {
			await api('/api/plan/reshuffle', 'POST', {
				moves: [{ slotId: m.slotId, ...m.suggestion }],
				drop: []
			});
			await load();
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}
	async function makeFirst(slotId: string) {
		busy = true;
		try {
			await api('/api/plan/reshuffle', 'POST', { moves: [], drop: [], firstToday: slotId });
			await load();
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}
	async function done(b: Block) {
		try {
			await api(`/api/steps/${b.step.id}/complete`, 'POST');
			feedMoment();
			await load();
		} catch (e) {
			failed(e);
		}
	}
</script>

<svelte:head>
	<title>Plan · createthings</title>
</svelte:head>

<main class="page">
	<!-- 16B heading and tabs -->
	<header class="head">
		<div class="title-block">
			<span class="label">
				{new Date().toLocaleDateString(undefined, {
					weekday: 'long',
					day: 'numeric',
					month: 'long'
				})}
			</span>
			<h1 class="title">Plan</h1>
		</div>
		<div class="tabs" role="tablist">
			<button
				role="tab"
				aria-selected={tab === 'today'}
				class:on={tab === 'today'}
				onclick={() => (tab = 'today')}
			>
				Today {today?.blocks.length ?? ''}
			</button>
			<button
				role="tab"
				aria-selected={tab === 'tomorrow'}
				class:on={tab === 'tomorrow'}
				onclick={() => (tab = 'tomorrow')}
			>
				Tomorrow {tomorrow?.blocks.length ?? ''}
			</button>
			<button
				role="tab"
				aria-selected={tab === 'week'}
				class:on={tab === 'week'}
				onclick={() => (tab = 'week')}
			>
				Week
			</button>
			<button
				role="tab"
				aria-selected={tab === 'wrap'}
				class:on={tab === 'wrap'}
				onclick={() => (tab = 'wrap')}
			>
				Wrap up{shutdown?.due ? ' ·' : ''}
			</button>
		</div>
	</header>

	<!-- 13: moved blocks and never-miss-twice, on Today only -->
	{#if tab === 'today' && reshuffle}
		{#if reshuffle.neverMissTwice}
			<div class="prompt" in:rise={{ y: 6, duration: 220 }}>
				<span class="prompt-text">{reshuffle.neverMissTwice.message}</span>
				<button
					class="btn-ink small"
					disabled={busy}
					onclick={() => reshuffle?.neverMissTwice && makeFirst(reshuffle.neverMissTwice.slotId)}
				>
					Make it today's #1
				</button>
			</div>
		{/if}
		{#if reshuffle.missed.length}
			<div class="prompt" in:rise={{ y: 6, duration: 220 }}>
				<span class="prompt-text">
					{reshuffle.missed.length}
					{reshuffle.missed.length === 1 ? 'block' : 'blocks'} moved? Let's place them.
				</span>
				<button class="btn-ink small" disabled={busy} onclick={placeAll}>Place them</button>
			</div>
			<div class="list">
				{#each reshuffle.missed as m (m.slotId)}
					<div class="moved block">
						<div class="moved-text">
							<div class="tag">Moved · needs a new slot</div>
							<div class="text muted">{m.step.title}, {m.step.minutes} min</div>
						</div>
						<button class="btn-white" disabled={busy} onclick={() => placeOne(m)}>Place it</button>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if tab === 'week'}
		<WeekPlanner onsaved={load} onerror={failed} />
	{:else if tab === 'wrap'}
		<!-- Daily shutdown -->
		<section class="wrap" in:rise={{ y: 8, duration: 220 }}>
			{#if wrapped}
				<div class="done-block block"><div class="tag green">{wrapped}</div></div>
			{/if}
			{#if !shutdown}
				<div class="skeleton"></div>
			{:else}
				<p class="muted">
					{shutdown.due
						? 'Time to wrap up the day.'
						: `Best after ${shutdown.shutdownTime.slice(0, 5)}, but you can do it any time.`}
				</p>
				<div class="wrap-part">
					<p class="wrap-label">Done today</p>
					{#if shutdown.done.length}
						{#each shutdown.done as d (d)}<div class="done-block block">
								<div class="text struck">{d}</div>
							</div>{/each}
					{:else}
						<p class="muted">Nothing ticked off yet. That's fine.</p>
					{/if}
				</div>
				{#if shutdown.moves.length}
					<div class="wrap-part">
						<p class="wrap-label">Moves to a new slot</p>
						{#each shutdown.moves as m (m.slotId)}
							<div class="moved block">
								<div class="moved-text">
									<div class="tag">
										To {m.suggestion.day}{m.suggestion.startTime
											? ` at ${m.suggestion.startTime.slice(0, 5)}`
											: ''}
									</div>
									<div class="text muted">{m.step.title}, {m.step.minutes} min</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<div class="wrap-part">
					<p class="wrap-label">
						Tomorrow's top 3 <span class="muted">· most important first</span>
					</p>
					{#each shutdown.tomorrow as t (t.stepId)}
						{@const n = picked.indexOf(t.stepId)}
						<button
							class="pick"
							class:on={n >= 0}
							aria-pressed={n >= 0}
							onclick={() => togglePick(t.stepId)}
						>
							<span class="pick-n">{n >= 0 ? n + 1 : ''}</span>
							<span class="pick-text"><b>{t.title}</b><small>{t.itemTitle}</small></span>
						</button>
					{:else}
						<p class="muted">Nothing to plan for tomorrow yet: start something from your inbox.</p>
					{/each}
				</div>
				<label class="wrap-label" for="day-note"
					>How did today go? <span class="muted">optional</span></label
				>
				<input
					id="day-note"
					class="note-field"
					bind:value={dayNote}
					maxlength="1000"
					placeholder="Got the chords down, slow on the F"
				/>
				<button class="btn-ink" disabled={busy} onclick={wrapUp}>Wrap up the day</button>
			{/if}
		</section>
	{:else}
		<!-- 05 BLOCK states -->
		<section class="list" aria-label={tab === 'today' ? "Today's blocks" : "Tomorrow's blocks"}>
			{#if problem}
				<div class="state">
					<p>{problem}</p>
					<button class="btn-white" onclick={load}>Try again</button>
				</div>
			{:else if !view}
				<div class="skeleton"></div>
				<div class="skeleton"></div>
			{:else if !view.blocks.length}
				<div class="state">
					<p class="empty-title">Nothing planned {tab === 'today' ? 'today' : 'tomorrow'}.</p>
					<p class="muted">Keep something from your inbox and start it; its steps land here.</p>
					<a class="btn-white" href={resolve('/app')}>Open your inbox</a>
				</div>
			{:else}
				{#key tab}
					<div class="list" in:rise={{ y: 8, duration: 220 }}>
						{#each view.blocks as b, i (b.slotId)}
							{#if b.step.done}
								<div class="done-block block" in:rise={{ y: 6, delay: reduce ? 0 : i * 40 }}>
									<div class="tag green">Done · fed {shell.pet?.pet.name ?? 'your pet'}</div>
									<div class="text struck">{b.intention}</div>
								</div>
							{:else if view.first?.slotId === b.slotId && tab === 'today'}
								<div class="first block" in:rise={{ y: 6, delay: reduce ? 0 : i * 40 }}>
									<div class="tag seal"><span class="dot"></span>TODAY'S #1</div>
									<div class="text big">{b.intention}</div>
									<div class="row-actions">
										<a class="btn-ink small" href="{resolve('/today')}?focus=1">Start pomodoro</a>
										<button class="btn-white" onclick={() => done(b)}>Done</button>
									</div>
								</div>
							{:else}
								<div class="block" in:rise={{ y: 6, delay: reduce ? 0 : i * 40 }}>
									<div class="tag split"><span>Planned</span><span>{when(b)}</span></div>
									<div class="text muted">{b.intention}</div>
									<div class="item-name">{b.item.title}</div>
								</div>
							{/if}
						{/each}
					</div>
				{/key}
			{/if}
		</section>
	{/if}
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
		gap: 24px;
		color: #1b1a17;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
	}
	.title-block {
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
	/* 16B tab pill. */
	.tabs {
		display: flex;
		gap: 2px;
		padding: 3px;
		background: #fff;
		border-radius: 999px;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
	}
	.tabs button {
		padding: 6px 12px;
		border-radius: 999px;
		color: #57534b;
		transition-property: background-color, color;
		transition-duration: 150ms;
	}
	.tabs button.on {
		background: #1b1a17;
		color: #fff;
		font-weight: 500;
	}
	/* 13: "2 blocks moved? Let's place them." */
	.prompt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px 14px 18px;
		border-radius: 16px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.prompt-text {
		font-size: 14px;
		line-height: 1.4;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	/* 05 BLOCK states. */
	.block {
		background: #fff;
		border-radius: 16px;
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.block.first {
		padding: 16px 18px;
		gap: 8px;
		box-shadow:
			0 0 0 1.5px oklch(0.6 0.15 35),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.block.done-block {
		background: oklch(0.95 0.03 145);
		box-shadow: none;
	}
	.block.moved {
		background: #efece5;
		box-shadow: none;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.moved-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.tag {
		font-size: 11px;
		color: #5f5a52;
	}
	.tag.split {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	.tag.green {
		color: oklch(0.4 0.1 145);
	}
	.tag.seal {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		color: oklch(0.48 0.14 35);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: oklch(0.6 0.15 35);
	}
	.text {
		font-size: 14px;
		line-height: 1.4;
	}
	.text.big {
		font-size: 15px;
		color: #1b1a17;
	}
	.muted {
		color: #57534b;
	}
	.struck {
		color: #57534b;
		text-decoration: line-through;
		text-decoration-color: #a8a296;
	}

	.wrap {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.wrap-part {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.wrap-label {
		font-size: 12px;
		font-weight: 600;
		color: #57534b;
	}
	.pick {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr);
		gap: 10px;
		align-items: center;
		padding: 10px 14px;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		text-align: start;
		transition-property: scale, box-shadow;
		transition-duration: 150ms;
	}
	.pick.on {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.pick:active {
		scale: 0.98;
	}
	.pick-n {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #efece5;
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.pick.on .pick-n {
		background: #1b1a17;
		color: #fff;
	}
	.pick-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 14px;
	}
	.pick-text small {
		font-size: 12px;
		color: #5f5a52;
	}
	.note-field {
		height: 42px;
		padding: 0 14px;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 14px;
		outline: none;
	}
	.note-field:focus-visible {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.item-name {
		font-size: 12px;
		color: #5f5a52;
	}
	.row-actions {
		display: flex;
		gap: 8px;
		padding-top: 4px;
	}
	.btn-ink,
	.btn-white {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 500;
		white-space: nowrap;
		transition-property: scale;
		transition-duration: 150ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
	.btn-ink {
		height: 38px;
		padding: 0 20px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
	}
	.btn-ink.small {
		height: 32px;
		padding: 0 14px;
		font-size: 13px;
	}
	.btn-white {
		height: 28px;
		padding: 0 12px;
		background: #fff;
		color: #1b1a17;
		font-size: 12px;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.row-actions .btn-white {
		height: 32px;
		padding: 0 14px;
		font-size: 13px;
	}
	.btn-ink:active,
	.btn-white:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.5;
	}
	.state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		font-size: 14px;
	}
	.empty-title {
		font-family: 'Instrument Serif', serif;
		font-size: 28px;
	}
	.skeleton {
		height: 64px;
		border-radius: 16px;
		background: #efece5;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
</style>
