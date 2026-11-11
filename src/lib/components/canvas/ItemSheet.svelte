<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { api } from '$lib/api';
	import { reduced, rise } from '$lib/motion';
	import { coverFor } from '$lib/covers';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { startThing, START_COST, type StartStage } from '$lib/start';
	import AtLimit from '$lib/components/shared/AtLimit.svelte';

	/**
	 * An opened thing (design system 03, 05, 06, 04):
	 * - 05 ITEM card at the "open" depth, rising from where it sat on the canvas (03 motion: 240 ms
	 *   ease-out; the canvas behind blurs 8 px and dims). On phones it is a full sheet (radius 24).
	 * - 06 confirm card: the pet's speech bubble with its guess; the guessed intent is tappable.
	 * - 04 buttons for sorting a thing that's ready: Keep (ink), Keep for later, Let it go (quiet).
	 */

	type Item = {
		id: string;
		title: string;
		sourceUrl: string | null;
		status: string;
		intent: string;
		size: string | null;
		difficulty: string | null;
	};
	type Analysis = {
		summary: string | null;
		colors: { palette?: { colors?: { hex: string; share: number }[] } } | null;
	} | null;
	type Understanding = {
		title: string;
		intent: { id: string; label: string };
		practiceKind: { id: string; label: string } | null;
		goal: string | null;
		targetDate: string | null;
		confirmed: boolean;
		choices: { intents: { id: string; label: string }[] };
	};

	let {
		itemId,
		origin,
		preview,
		statusWord,
		pet,
		onclose,
		ondecided,
		onchanged,
		onerror,
		onstarted
	}: {
		itemId: string;
		/** Where the object sat on the canvas, so the card rises from there. */
		origin: DOMRect | null;
		preview?: string;
		statusWord: (status: string) => string;
		pet: { name: string; species: string; state: string } | null;
		onclose: () => void;
		ondecided: (id: string, decision: 'keep' | 'later' | 'let_go') => void;
		onchanged: (item: Item) => void;
		onerror: (e: unknown) => void;
		/** The thing was started and its first step is on today. */
		onstarted?: (id: string) => void;
	} = $props();

	const SIZE: Record<string, string> = {
		afternoon: 'An afternoon',
		weekend: 'A weekend',
		week: 'A week',
		month: 'A month'
	};
	const DIFFICULTY: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

	let item = $state<Item | null>(null);
	let analysis = $state<Analysis>(null);
	let understanding = $state<Understanding | null>(null);
	let intentOpen = $state(false);
	let confirmLabel = $state('Yes');
	let busy = $state(false);
	let card = $state<HTMLElement>();

	const host = $derived.by(() => {
		try {
			return item?.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, '') : null;
		} catch {
			return null;
		}
	});
	const palette = $derived(
		(analysis?.colors?.palette?.colors ?? [])
			.slice()
			.sort((a, b) => b.share - a.share)
			.slice(0, 4)
	);
	const meta = $derived(
		[
			understanding?.intent.label,
			item?.size ? SIZE[item.size] : null,
			item?.difficulty ? DIFFICULTY[item.difficulty] : null
		].filter(Boolean)
	);
	const ready = $derived(item?.status === 'ready');
	/** Kept or paused things can be started (ready ones are sorted first). */
	const startable = $derived(item?.status === 'shortlist' || item?.status === 'paused');
	let stage = $state<StartStage | 'done' | 'problem' | null>(null);
	let stageText = $state('');
	const STAGE: Record<StartStage, string> = {
		confirming: 'Starting…',
		starting: 'Starting…',
		planning: 'Making the plan. This takes about a minute.',
		placing: 'Putting the first step on today…'
	};

	async function start() {
		if (stage && stage !== 'problem') return;
		const result = await startThing(itemId, (s) => {
			stage = s;
			stageText = STAGE[s];
		});
		if (result.status === 'planned') {
			stage = 'done';
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
			goto(`${resolve('/today')}?started=${encodeURIComponent(item?.title ?? '')}`);
			stageText = `First step on today: ${result.stepTitle}`;
			if (item) item = { ...item, status: 'focus' };
			onstarted?.(itemId);
		} else if (result.status === 'at_limit') {
			stage = null;
			limitInfo = { limit: result.limit, focus: result.focus };
		} else {
			stage = 'problem';
			stageText = result.message;
		}
	}
	let limitInfo = $state<{ limit: number; focus: { id: string; title: string }[] } | null>(null);
	const reduce = reduced();
	let closing = $state(false);
	/** Which way the card leaves while sorting: Keep and Let it go go left, Later goes right. */
	let dir = $state(1);

	async function load(id: string) {
		// Keep the current card until the next one has loaded, then they swap (no empty flash).
		intentOpen = false;
		confirmLabel = 'Yes';
		try {
			const [res, u] = await Promise.all([
				api<{ item: Item; analysis: Analysis }>(`/api/items/${id}`),
				api<Understanding>(`/api/items/${id}/understanding`).catch(() => null)
			]);
			item = res.item;
			analysis = res.analysis;
			understanding = u;
			busy = false;
		} catch (e) {
			onerror(e);
			close();
		}
	}

	$effect(() => {
		load(itemId);
	});

	/** 03 motion: the card rises from where it sat on the canvas. */
	onMount(async () => {
		await tick();
		if (!origin || !card || reduce) return;
		const to = card.getBoundingClientRect();
		const dx = origin.left + origin.width / 2 - (to.left + to.width / 2);
		const dy = origin.top + origin.height / 2 - (to.top + to.height / 2);
		const s = Math.max(0.2, Math.min(1, origin.width / to.width));
		card.animate(
			[
				{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 },
				{ transform: 'none', opacity: 1 }
			],
			{ duration: 240, easing: 'ease-out' }
		);
	});

	async function confirm(intent?: string) {
		if (busy) return;
		busy = true;
		try {
			const res = await api<{ understanding: Understanding }>(
				`/api/items/${itemId}/understanding`,
				'PUT',
				intent ? { intent } : {}
			);
			understanding = res.understanding;
			intentOpen = false;
			if (intent && item) {
				item = { ...item, intent };
				onchanged(item);
			}
			// 06: after a correction the button reads "Got it" for a moment.
			confirmLabel = 'Got it';
			setTimeout(() => (confirmLabel = 'Yes'), 1400);
		} catch (e) {
			onerror(e);
		} finally {
			busy = false;
		}
	}

	async function decide(decision: 'keep' | 'later' | 'let_go') {
		if (busy) return;
		busy = true;
		dir = decision === 'later' ? -1 : 1;
		try {
			await api('/api/triage', 'POST', { itemId, decision });
			// Stays busy until the next card has loaded (load() clears it).
			ondecided(itemId, decision);
		} catch (e) {
			busy = false;
			onerror(e);
		}
	}

	/** 03 motion, in reverse: the card settles back toward where it sat, the scrim fades. */
	async function close() {
		if (closing) return;
		closing = true;
		if (card && !reduce) {
			const from = card.getBoundingClientRect();
			const keyframe = origin
				? {
						transform: `translate(${origin.left + origin.width / 2 - (from.left + from.width / 2)}px, ${origin.top + origin.height / 2 - (from.top + from.height / 2)}px) scale(${Math.max(0.2, Math.min(1, origin.width / from.width))})`,
						opacity: 0
					}
				: { transform: 'translateY(12px) scale(0.97)', opacity: 0 };
			await card
				.animate([{ transform: 'none', opacity: 1 }, keyframe], {
					duration: 200,
					easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
					fill: 'forwards'
				})
				.finished.catch(() => {});
		}
		onclose();
	}

	function onkey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onkey} />

<div class="scrim" class:closing role="presentation" onclick={close}></div>

<div class="sheet" role="dialog" aria-modal="true" aria-label={item?.title ?? 'Opening'}>
	<div class="stack" bind:this={card}>
		<div class="swap">
			{#key item?.id}
				<div
					class="slot"
					in:rise={{ x: 28 * dir, duration: 240 }}
					out:rise={{ x: -28 * dir, duration: 200 }}
				>
					<!-- 05 ITEM card -->
					<article class="item">
						<img class="image" src={preview ?? coverFor(itemId, 800)} alt="" />
						{#if palette.length}
							<div class="palette" aria-hidden="true">
								{#each palette as c (c.hex)}<div style:background={c.hex}></div>{/each}
							</div>
						{/if}
						<div class="body">
							{#if !item}
								<div class="skeleton w60"></div>
								<div class="skeleton w90 tall"></div>
								<div class="skeleton w80"></div>
							{:else}
								{#if meta.length}
									<div class="meta"><span class="dot"></span>{meta.join(' · ')}</div>
								{/if}
								<div class="title">{item.title}</div>
								{#if analysis?.summary}
									<div class="summary">{analysis.summary}</div>
								{/if}
								<div class="foot">
									<span>{statusWord(item.status)}</span>
									<a class="full" href={resolve(`/things/${item.id}`)}>Open the plan →</a>
									{#if host && item.sourceUrl}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- the saved page, not an app route -->
										<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{host}</a>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									{/if}
								</div>
							{/if}
						</div>
					</article>

					<!-- 06 confirm card: the pet's guess -->
					{#if item && understanding && !understanding.confirmed}
						<div class="confirm">
							<div class="who">
								{#if pet}
									<span
										class="pet"
										data-ct
										data-species={pet.species}
										data-state={pet.state}
										data-action="idle"
										aria-hidden="true"
									>
										<ct-kawaii class="fill"></ct-kawaii>
									</span>
									<span class="who-name">{pet.name}</span>
								{/if}
							</div>
							<div class="bubble">
								<div class="said">
									Looks like you want to <button
										class="guess"
										aria-expanded={intentOpen}
										onclick={() => (intentOpen = !intentOpen)}
										>{understanding.intent.label.toLowerCase()}</button
									>: {understanding.title}.{#if understanding.goal}
										Goal: <span class="guessed">{understanding.goal.replace(/[.!]+$/, '')}</span
										>.{/if}
									Right?
								</div>
								{#if intentOpen}
									<div class="options" transition:slide={{ duration: reduce ? 0 : 200 }}>
										{#each understanding.choices.intents as o (o.id)}
											<button
												class="option"
												class:on={o.id === understanding.intent.id}
												disabled={busy}
												onclick={() => confirm(o.id)}>{o.label}</button
											>
										{/each}
									</div>
								{/if}
								<div class="chips">
									{#if understanding.practiceKind}<span class="chip"
											>{understanding.practiceKind.label}</span
										>{/if}
									<span class="chip">{understanding.targetDate ?? 'No target date'}</span>
								</div>
								<div class="confirm-row">
									{#if startable}
										<button class="btn-ink" disabled={busy || !!stage} onclick={start}
											>Yes, start · {START_COST} cr</button
										>
									{:else}
										<button
											class={ready ? 'btn-white' : 'btn-ink'}
											disabled={busy}
											onclick={() => confirm()}>{confirmLabel}</button
										>
									{/if}
									<span class="hint">Tap any underlined part to change it</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Start: makes the plan and puts the first step on today -->
		{#if item && (stage || limitInfo || (startable && understanding?.confirmed !== false))}
			<div class="start" in:rise={{ y: 6, duration: 200 }}>
				{#if limitInfo}
					<AtLimit
						limit={limitInfo.limit}
						focus={limitInfo.focus}
						onresolved={() => ((limitInfo = null), start())}
					/>
				{:else if stage}
					<p class="stage" class:bad={stage === 'problem'} role="status">{stageText}</p>
					{#if stage === 'done'}
						<a class="btn-ink" href={resolve('/today')}>Go to today</a>
					{:else if stage === 'problem'}
						<button class="btn-white" onclick={start}>Try again</button>
					{/if}
				{:else}
					<button class="btn-ink" onclick={start}>Start · {START_COST} cr</button>
					<p class="stage">Makes a plan and puts the first step on today.</p>
				{/if}
			</div>
		{/if}

		<!-- 04 buttons: sorting a thing that's ready -->
		{#if item && ready}
			<div class="decide">
				<button class="btn-ink" disabled={busy} onclick={() => decide('keep')}>Keep</button>
				<button class="btn-white" disabled={busy} onclick={() => decide('later')}
					>Keep for later</button
				>
				<button class="btn-quiet" disabled={busy} onclick={() => decide('let_go')}>Let it go</button
				>
			</div>
		{/if}
	</div>
</div>

<style>
	.start {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 14px 16px;
		background: #fff;
		border-radius: 16px;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.stage {
		flex: 1;
		min-width: 180px;
		font-size: 13px;
		line-height: 1.45;
		color: #57534b;
	}
	.stage.bad {
		color: oklch(0.5 0.15 35);
	}
	/* 03: the canvas behind blurs (8px) and dims. */
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgba(27, 26, 23, 0.18);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		animation: fade 240ms ease-out;
	}
	.scrim {
		transition: opacity 200ms var(--ease-out);
	}
	.scrim.closing {
		opacity: 0;
	}
	/* Sorting: the leaving and arriving cards share one spot. */
	.swap {
		display: grid;
	}
	.slot {
		grid-area: 1 / 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	/* Press feedback. */
	.btn-ink,
	.btn-white,
	.btn-quiet,
	.option,
	.guess {
		transition:
			transform var(--dur-press) var(--ease-out),
			background-color var(--dur-press) var(--ease-out),
			box-shadow var(--dur-press) var(--ease-out);
	}
	.btn-ink:active,
	.btn-white:active,
	.btn-quiet:active,
	.option:active {
		transform: scale(0.96);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.sheet {
		position: fixed;
		inset: 0;
		z-index: 31;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		pointer-events: none;
		overflow-y: auto;
	}
	.stack {
		pointer-events: auto;
		width: min(440px, 100%);
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin: auto 0;
	}

	/* 05 ITEM card, at the 03 "open" depth. */
	.item {
		background: #fff;
		border-radius: 16px;
		overflow: hidden;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.image {
		display: block;
		width: 100%;
		height: 140px;
		object-fit: cover;
	}
	.palette {
		display: flex;
		height: 6px;
	}
	.palette div {
		flex: 1;
	}
	.body {
		padding: 16px 18px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #5f5a52;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #1b1a17;
	}
	.title {
		font-size: 17px;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.summary {
		font-size: 13px;
		line-height: 1.45;
		color: #57534b;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 6px;
		font-size: 12px;
		color: #5f5a52;
	}
	.full {
		font-weight: 500;
		color: #1b1a17;
	}
	.foot a:hover {
		text-decoration: underline;
	}
	.skeleton {
		height: 12px;
		border-radius: 6px;
		background: #efece5;
	}
	.skeleton.tall {
		height: 20px;
	}
	.w60 {
		width: 60%;
	}
	.w80 {
		width: 80%;
	}
	.w90 {
		width: 90%;
	}

	/* 06 confirm card. */
	.confirm {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.who {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}
	.pet {
		position: relative;
		width: 48px;
		height: 42px;
		flex: none;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.who-name {
		font-size: 12px;
		color: #f6f4ef;
		text-shadow: 0 1px 2px rgba(27, 26, 23, 0.3);
	}
	.bubble {
		background: #fff;
		border-radius: 20px;
		border-top-left-radius: 6px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 12px 32px rgba(27, 26, 23, 0.08);
	}
	.said {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		line-height: 1.3;
	}
	.guess,
	.guessed {
		font: inherit;
		font-style: italic;
		color: #1b1a17;
		border-bottom: 1.5px dashed #a8a296;
	}
	.guess {
		cursor: pointer;
	}
	.options {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		padding: 12px;
		background: #f6f4ef;
		border-radius: 14px;
	}
	.option {
		height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		background: #fff;
		color: #1b1a17;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
		font-weight: 500;
	}
	.option.on {
		background: #1b1a17;
		color: #fff;
	}
	.chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 12px;
		color: #57534b;
	}
	.chip {
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		background: #efece5;
		display: flex;
		align-items: center;
	}
	.confirm-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.hint {
		font-size: 12px;
		color: #5f5a52;
	}

	/* 04 buttons. */
	.decide {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
	}
	.btn-ink,
	.btn-white,
	.btn-quiet {
		height: 38px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.btn-ink {
		padding: 0 20px;
		background: #1b1a17;
		color: #fff;
	}
	.btn-ink:hover {
		background: #33312c;
	}
	.btn-white {
		padding: 0 18px;
		background: #fff;
		color: #1b1a17;
		box-shadow:
			0 0 0 1px #e4e0d7,
			0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.btn-white:hover {
		box-shadow:
			0 0 0 1px #c9c3b6,
			0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.btn-quiet {
		padding: 0 14px;
		background: transparent;
		color: #57534b;
	}
	.decide .btn-quiet {
		color: #f6f4ef;
	}
	.btn-quiet:hover {
		color: #1b1a17;
		background: #efece5;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}

	/* Phones: a full sheet from the bottom, radius 24 (03). */
	@media (max-width: 720px) {
		.sheet {
			align-items: flex-end;
			padding: 0;
		}
		.stack {
			width: 100%;
			margin: 0;
			padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
			max-height: 92svh;
			overflow-y: auto;
			background: #f6f4ef;
			border-radius: 24px 24px 0 0;
			box-shadow: 0 -24px 60px rgba(27, 26, 23, 0.14);
		}
		.who-name,
		.decide .btn-quiet {
			color: #57534b;
			text-shadow: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.scrim {
			animation: none;
		}
		.btn-ink:active,
		.btn-white:active,
		.btn-quiet:active,
		.option:active {
			transform: none;
		}
	}
</style>
