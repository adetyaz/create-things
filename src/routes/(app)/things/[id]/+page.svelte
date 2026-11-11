<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { api, ApiError } from '$lib/api';
	import { rise } from '$lib/motion';
	import { coverFor } from '$lib/covers';
	import { feedMoment, shell } from '$lib/shell.svelte';
	import { startThing, retryPlan, START_COST, type StartStage } from '$lib/start';
	import AtLimit from '$lib/components/shared/AtLimit.svelte';
	import FitItIn from '$lib/components/plan/FitItIn.svelte';
	import AboutForm from '$lib/components/things/AboutForm.svelte';

	/**
	 * One thing, start to finish: what the pet read (05 ITEM), what it thinks you want (06 confirm),
	 * Start (makes the plan), then the roadmap: milestones, the current step as the 05 STEP card
	 * (2-minute start, what to search for, tools, Done) and the milestone finale as the 05 PROOF card.
	 * Every state says what's happening and what to do next.
	 */

	type Item = {
		id: string;
		title: string;
		sourceUrl: string | null;
		note: string | null;
		status: string;
		intent: string;
		size: string | null;
		difficulty: string | null;
		analysisError: string | null;
		planError: string | null;
	};
	type Analysis = {
		summary: string | null;
		colors: { palette?: { colors?: { hex: string; share: number }[] } } | null;
	} | null;
	type Understanding = {
		intent: { id: string; label: string };
		goal: string | null;
		confirmed: boolean;
		choices: { intents: { id: string; label: string }[] };
	};
	type Step = {
		id: string;
		title: string;
		minutes: number;
		twoMinute: string | null;
		searchTerms: string[] | null;
		tools: string[] | null;
		recall: string | null;
		recallAnswer: string | null;
		kind: string;
		doneAt: string | null;
	};
	type Roadmap = {
		roadmap: { goal: string | null };
		milestones: { title: string; done: boolean; steps: Step[] }[];
		currentStep: Step | null;
		doneSteps: number;
		totalSteps: number;
	} | null;

	const SIZE: Record<string, string> = {
		afternoon: 'An afternoon',
		weekend: 'A weekend',
		week: 'A week',
		month: 'A month'
	};
	const DIFFICULTY: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

	const id = $derived(page.params.id ?? '');
	let item = $state<Item | null>(null);
	let analysis = $state<Analysis>(null);
	let understanding = $state<Understanding | null>(null);
	let roadmap = $state<Roadmap>(null);
	let planError = $state<string | null>(null);
	let problem = $state<string | null>(null);
	let busy = $state(false);
	let intentOpen = $state(false);
	let stage = $state<StartStage | 'done' | 'problem' | null>(null);
	let stageText = $state('');
	let limitInfo = $state<{ limit: number; focus: { id: string; title: string }[] } | null>(null);
	/** Fit it in (instead of starting): shown on request, or straight away from ?fit=1. */
	let fitting = $state(false);
	let fitted = $state<string | null>(null);
	/** "Tell me about it" was answered (or skipped), so Start can plan. */
	let skipAbout = $state(false);
	const described = $derived(!!item?.note?.includes('About it (from you):'));
	/** Finishing: an optional note, then what's next. */
	let finishNote = $state('');
	type NextUp = {
		item: { id: string; title: string };
		reason: string;
		carriesOver: string[];
		alternatives: { id: string; title: string }[];
	} | null;
	let finished = $state<{ next: NextUp } | null>(null);

	const reading = $derived(!!item && item.status === 'inbox' && !analysis && !item.analysisError);
	const startable = $derived(
		!!item && ['ready', 'shortlist', 'paused'].includes(item.status) && !!analysis
	);
	const planning = $derived(!!item && item.status === 'focus' && !roadmap && !planError);
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
	const STATUS: Record<string, string> = {
		inbox: 'Being read',
		ready: 'Ready to start',
		shortlist: 'Kept',
		focus: 'Doing',
		paused: 'Paused',
		done: 'Done',
		reference: 'Reference',
		archived: 'Let go'
	};
	const STAGE: Record<StartStage, string> = {
		confirming: 'Starting…',
		starting: 'Starting…',
		planning: 'Making the plan. This takes about a minute.',
		placing: 'Putting the first step on today…'
	};

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		try {
			const [res, u, r] = await Promise.all([
				api<{ item: Item; analysis: Analysis }>(`/api/items/${id}`),
				api<Understanding>(`/api/items/${id}/understanding`).catch(() => null),
				api<{ roadmap: Roadmap; planError: string | null }>(`/api/items/${id}/roadmap`).catch(
					() => ({ roadmap: null, planError: null })
				)
			]);
			item = res.item;
			analysis = res.analysis;
			understanding = u;
			roadmap = r.roadmap;
			planError = r.planError;
			problem = null;
		} catch (e) {
			failed(e);
		}
	}
	onMount(() => {
		if (page.url.searchParams.has('fit')) fitting = true;
		void load();
	});

	// While the pet is reading or planning, check again every few seconds.
	$effect(() => {
		if (!reading && !planning) return;
		const t = setInterval(load, 3500);
		return () => clearInterval(t);
	});

	async function start() {
		if (stage && stage !== 'problem') return;
		const result = await startThing(id, (s) => {
			stage = s;
			stageText = STAGE[s];
		});
		if (result.status === 'planned') {
			stage = null;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
			goto(`${resolve('/today')}?started=${encodeURIComponent(item?.title ?? '')}`);
		} else if (result.status === 'at_limit') {
			stage = null;
			limitInfo = { limit: result.limit, focus: result.focus };
		} else {
			stage = 'problem';
			stageText = result.message;
		}
		await load();
	}

	async function planAgain() {
		planError = null;
		const result = await retryPlan(id, (s) => {
			stage = s;
			stageText = STAGE[s];
		});
		if (result.status === 'planned') {
			stage = null;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
			goto(`${resolve('/today')}?started=${encodeURIComponent(item?.title ?? '')}`);
		} else {
			stage = 'problem';
			stageText = result.message;
		}
		await load();
	}

	async function confirm(intent?: string) {
		busy = true;
		try {
			const r = await api<{ understanding: Understanding }>(
				`/api/items/${id}/understanding`,
				'PUT',
				intent ? { intent } : {}
			);
			understanding = r.understanding;
			intentOpen = false;
			if (intent && item) item = { ...item, intent };
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}

	async function readAgain() {
		busy = true;
		try {
			await api(`/api/items/${id}/analyze`, 'POST');
			if (item) item = { ...item, analysisError: null, status: 'inbox' };
			analysis = null;
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}

	async function finish() {
		busy = true;
		try {
			const r = await api<{ next: NextUp }>(`/api/items/${id}/finish`, 'POST', {
				note: finishNote.trim() || undefined
			});
			finished = { next: r.next };
			feedMoment();
			await load();
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}

	// The plan scrolls inside its own card; a fade and "More steps ↓" show there's more below.
	let roadEl = $state<HTMLElement>();
	let canScrollDown = $state(false);
	let openedAtStep = false;
	function checkScroll() {
		if (!roadEl) return;
		canScrollDown = roadEl.scrollTop + roadEl.clientHeight < roadEl.scrollHeight - 8;
	}
	function scrollDown() {
		roadEl?.scrollBy({ top: roadEl.clientHeight * 0.8, behavior: 'smooth' });
	}
	$effect(() => {
		if (!roadmap || !roadEl) return;
		// Open at the current step the first time the plan shows.
		requestAnimationFrame(() => {
			if (!roadEl) return;
			if (!openedAtStep) {
				const current = roadEl.querySelector<HTMLElement>('.step-card, .proof');
				if (current) roadEl.scrollTop = Math.max(0, current.offsetTop - roadEl.offsetTop - 56);
				openedAtStep = true;
			}
			checkScroll();
		});
	});

	const search = (term: string) => `https://www.google.com/search?q=${encodeURIComponent(term)}`;
</script>

<svelte:head>
	<title>{item?.title ?? 'A thing'} · createthings</title>
</svelte:head>

<main class="page">
	<a class="back" href={resolve('/app')}>← Inbox</a>

	{#if problem && !item}
		<div class="state">
			<p>{problem}</p>
			<button class="btn-white" onclick={load}>Try again</button>
		</div>
	{:else if !item}
		<div class="skeleton tall"></div>
		<div class="skeleton"></div>
	{:else}
		<!-- 05 ITEM -->
		<article class="item" in:rise={{ y: 8, duration: 240 }}>
			<img class="image" src={coverFor(item.id, 900)} alt="" />
			{#if palette.length}
				<div class="palette" aria-hidden="true">
					{#each palette as c (c.hex)}<div style:background={c.hex}></div>{/each}
				</div>
			{/if}
			<div class="body">
				{#if meta.length}<div class="meta"><span class="dot"></span>{meta.join(' · ')}</div>{/if}
				<h1 class="title">{item.title}</h1>
				{#if analysis?.summary}<p class="summary">{analysis.summary}</p>{/if}
				{#if item.note && item.note !== item.title}<p class="note">{item.note}</p>{/if}
				<div class="foot">
					<span>{STATUS[item.status] ?? item.status}</span>
					{#if host && item.sourceUrl}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- the saved page, not an app route -->
						<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{host} ↗</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{/if}
				</div>
			</div>
		</article>

		<!-- What's happening, and the one next thing to do -->
		<section class="next" aria-live="polite">
			{#if limitInfo}
				<AtLimit
					limit={limitInfo.limit}
					focus={limitInfo.focus}
					onresolved={() => ((limitInfo = null), start())}
				/>
			{:else if reading}
				<div class="state-row">
					<span class="spin" aria-hidden="true"></span>
					<div>
						<p class="strong">{shell.pet?.pet.name ?? 'Your pet'} is reading it.</p>
						<p class="muted">
							What it is, how big, and what you're trying to do. Usually under a minute.
						</p>
					</div>
				</div>
			{:else if item.analysisError}
				<p class="strong">It couldn't be read.</p>
				<p class="muted">{item.analysisError}</p>
				<button class="btn-ink" disabled={busy} onclick={readAgain}>Read it again · 2 cr</button>
			{:else if stage}
				<div class="state-row">
					{#if stage !== 'problem' && stage !== 'done'}<span class="spin" aria-hidden="true"
						></span>{/if}
					<p class="strong" class:bad={stage === 'problem'}>{stageText}</p>
				</div>
				{#if stage === 'done'}
					<a class="btn-ink" href={resolve('/today')}>Go to today</a>
				{:else if stage === 'problem'}
					<button class="btn-white" onclick={item.status === 'focus' ? planAgain : start}
						>Try again</button
					>
				{/if}
			{:else if planning}
				<div class="state-row">
					<span class="spin" aria-hidden="true"></span>
					<div>
						<p class="strong">Making the plan.</p>
						<p class="muted">
							Small steps of 15–30 minutes, each with a two-minute start. About a minute.
						</p>
					</div>
				</div>
			{:else if planError}
				<p class="strong">The plan couldn't be made.</p>
				<p class="muted">{planError}</p>
				<button class="btn-ink" onclick={planAgain}>Try again · {START_COST} cr</button>
			{:else if startable && !described && !skipAbout}
				<AboutForm
					itemId={item.id}
					intent={item.intent}
					title={item.title}
					onsaved={load}
					onskip={() => (skipAbout = true)}
				/>
			{:else if startable}
				<p class="strong">Ready to plan it.</p>
				<p class="muted">
					{described
						? 'The plan will follow what you told me, and its first step lands on Today.'
						: 'Starting makes a step-by-step plan, and its first step lands on Today.'}
				</p>
				<button class="btn-ink" onclick={start}>Start · {START_COST} cr</button>
			{:else if roadmap?.currentStep}
				<p class="strong">
					The plan is ready: {roadmap.doneSteps} of {roadmap.totalSteps} steps done.
				</p>
				<p class="muted">Your steps show up on Today, one at a time, with what to start now.</p>
				<a class="btn-ink" href={resolve('/today')}>Go to today</a>
			{:else if finished}
				<p class="strong">Finished. {shell.pet?.pet.name ?? 'Your pet'} had a feast.</p>
				{#if finished.next}
					<p class="muted">
						What's next: <b>{finished.next.item.title}</b>. {finished.next.reason}
					</p>
					{#if finished.next.carriesOver.length}
						<div class="chips">
							<span class="muted tiny">Carries over:</span>
							{#each finished.next.carriesOver as c (c)}<span class="chip">{c}</span>{/each}
						</div>
					{/if}
					<a class="btn-ink" href={resolve(`/things/${finished.next.item.id}`)}>Open it</a>
					{#if finished.next.alternatives.length}
						<p class="muted tiny">
							Or:
							{#each finished.next.alternatives.slice(0, 3) as a, i (a.id)}{i ? ' · ' : ''}<a
									class="alt"
									href={resolve(`/things/${a.id}`)}>{a.title}</a
								>{/each}
						</p>
					{/if}
				{:else}
					<a class="btn-ink" href={resolve('/today')}>Back to today</a>
				{/if}
			{:else if item.status === 'done'}
				<p class="strong">Finished.</p>
				<p class="muted">{shell.pet?.pet.name ?? 'Your pet'} remembers what you built.</p>
			{:else if roadmap && !roadmap.currentStep}
				<p class="strong">Every step is done.</p>
				<p class="muted">
					Finish it: {shell.pet?.pet.name ?? 'your pet'} gets a feast, remembers what you built, and suggests
					what's next.
				</p>
				<label class="sr-only" for="finish-note">What did you build?</label>
				<input
					id="finish-note"
					class="field"
					bind:value={finishNote}
					maxlength="1000"
					placeholder="What did you build? (optional)"
				/>
				<button class="btn-ink" disabled={busy} onclick={finish}>Finish it · 1 cr</button>
			{/if}
		</section>

		<!-- Fit it in: a new idea mid-plan, instead of starting a new pile -->
		{#if fitted}
			<div class="next" in:rise={{ y: 6, duration: 200 }}>
				<p class="strong">{fitted}</p>
				<a class="btn-ink" href={resolve('/today')}>Back to today</a>
			</div>
		{:else if item && !reading && !['focus', 'done', 'archived'].includes(item.status)}
			{#if fitting}
				<FitItIn itemId={item.id} onapplied={(m) => ((fitted = m), load())} />
			{:else}
				<button class="fit-open" onclick={() => (fitting = true)}
					>Already working on something? <b>Fit it in instead</b> of starting a new pile →</button
				>
			{/if}
		{/if}

		<!-- 06 confirm card: the pet's guess, before starting -->
		{#if understanding && !understanding.confirmed && !reading && item.status !== 'focus'}
			<div class="bubble">
				<div class="said">
					Looks like you want to <button
						class="guess"
						aria-expanded={intentOpen}
						onclick={() => (intentOpen = !intentOpen)}
						>{understanding.intent.label.toLowerCase()}</button
					>{#if understanding.goal}. Goal: <span class="guessed">{understanding.goal}</span>{/if}.
					Right?
				</div>
				{#if intentOpen}
					<div class="options">
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
				<div class="confirm-row">
					<button class="btn-white" disabled={busy} onclick={() => confirm()}>Yes</button>
					<span class="muted small">Tap the underlined part to change it. Free.</span>
				</div>
			</div>
		{/if}

		<!-- The roadmap -->
		{#if roadmap}
			<section class="roadmap" aria-label="Plan">
				<div class="road-head">
					<div class="road-title-row">
						<h2 class="road-title">The plan</h2>
						<span class="ready"
							><span class="ready-dot"></span>Ready · {roadmap.totalSteps} steps</span
						>
					</div>
					<span class="muted small">{roadmap.doneSteps} done</span>
				</div>
				<div class="progress" aria-hidden="true">
					<div
						style:width="{roadmap.totalSteps ? (roadmap.doneSteps / roadmap.totalSteps) * 100 : 0}%"
					></div>
				</div>
				{#if roadmap.roadmap.goal}
					<p class="goal">
						By the end you'll be able to {roadmap.roadmap.goal.replace(
							/^by the end you'll be able to\s*/i,
							''
						)}
					</p>
				{/if}

				<div class="road-frame">
					<!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrolling region must be focusable so keyboards can scroll it) -->
					<div
						class="road-scroll"
						bind:this={roadEl}
						onscroll={checkScroll}
						tabindex="0"
						role="region"
						aria-label="The plan, step by step"
					>
						{#each roadmap.milestones as m, mi (m.title + mi)}
							<div class="milestone" class:done={m.done}>
								<p class="m-label">Milestone {mi + 1}{m.done ? ' · done' : ''}</p>
								<h3 class="m-title">{m.title}</h3>
								<div class="steps">
									{#each m.steps as s (s.id)}
										{#if s.id === roadmap.currentStep?.id && s.kind !== 'proof'}
											<!-- 05 STEP · CURRENT -->
											<div class="step-card">
												{#if s.twoMinute}
													<div class="two">
														<p class="two-label">2-MINUTE START</p>
														<p class="two-text">{s.twoMinute}</p>
													</div>
												{/if}
												<div class="step-head">
													<span class="step-title">{s.title}</span>
													<span class="mono">{s.minutes} min</span>
												</div>
												{#if s.searchTerms?.length}
													<div class="chips-block">
														<p class="muted tiny">Search for</p>
														<div class="chips">
															{#each s.searchTerms as t (t)}
																<!-- eslint-disable svelte/no-navigation-without-resolve -- a web search -->
																<a
																	class="chip-out"
																	href={search(t)}
																	target="_blank"
																	rel="noopener noreferrer">↗ {t}</a
																>
																<!-- eslint-enable svelte/no-navigation-without-resolve -->
															{/each}
														</div>
													</div>
												{/if}
												{#if s.tools?.length}
													<div class="chips-block">
														<p class="muted tiny">Tools</p>
														<div class="chips">
															{#each s.tools as t (t)}<span class="chip">{t}</span>{/each}
														</div>
													</div>
												{/if}
												<div class="row">
													<a
														class="btn-white"
														href="{resolve(
															'/talk'
														)}?mode=stuck&itemId={item.id}&stepId={s.id}&about={encodeURIComponent(
															s.title
														)}">I'm stuck · 1 cr</a
													>
													<a
														class="btn-quiet"
														href="{resolve(
															'/talk'
														)}?mode=teach&itemId={item.id}&stepId={s.id}&about={encodeURIComponent(
															s.title
														)}">Teach me · 1 cr</a
													>
												</div>
											</div>
										{:else if s.kind === 'proof'}
											<!-- 05 PROOF · the milestone's finale -->
											<div class="proof" class:faded={!!s.doneAt}>
												<span class="prove" aria-hidden="true">prove</span>
												<p class="proof-label">MILESTONE {mi + 1} FINALE</p>
												<p class="proof-title">{s.title}</p>
												{#if s.twoMinute}<p class="proof-text">{s.twoMinute}</p>{/if}
												{#if s.searchTerms?.length}
													<div class="chips">
														{#each s.searchTerms as t (t)}
															<!-- eslint-disable svelte/no-navigation-without-resolve -- a web search -->
															<a
																class="chip-dark"
																href={search(t)}
																target="_blank"
																rel="noopener noreferrer">↗ {t}</a
															>
															<!-- eslint-enable svelte/no-navigation-without-resolve -->
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<div class="step-row" class:done={!!s.doneAt}>
												<span class="check" aria-hidden="true">{s.doneAt ? '✓' : ''}</span>
												<span class="step-name">{s.title}</span>
												<span class="mono">{s.minutes} min</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
					{#if canScrollDown}
						<div class="fade" aria-hidden="true"></div>
						<button class="more" onclick={scrollDown} transition:rise={{ y: 6, duration: 180 }}
							>More steps ↓</button
						>
					{/if}
				</div>
			</section>
		{/if}
	{/if}
</main>

<style>
	/* A paper sheet on the sky, with the pet's dusty edge (10, 13). */
	.page {
		max-width: 720px;
		width: calc(100% - 32px);
		margin: 24px auto 48px;
		padding: 24px clamp(16px, 4vw, 40px) 40px;
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
		gap: 16px;
		color: #1b1a17;
		font-family: 'Geist', sans-serif;
	}
	.back {
		align-self: flex-start;
		font-size: 12px;
		color: #57534b;
		padding: 6px 12px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
	}

	/* 05 ITEM. */
	.item {
		background: #fff;
		border-radius: 16px;
		overflow: hidden;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.image {
		display: block;
		width: 100%;
		height: 180px;
		object-fit: cover;
		outline: 1px solid oklch(0 0 0 / 0.1);
		outline-offset: -1px;
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
		font-size: 20px;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.summary {
		font-size: 14px;
		line-height: 1.5;
		color: #57534b;
	}
	.note {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
		white-space: pre-wrap;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		padding-top: 6px;
		font-size: 12px;
		color: #5f5a52;
	}

	/* The next thing to do. */
	.next {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 16px 18px;
		background: #fff;
		border-radius: 16px;
		box-shadow:
			0 0 0 1.5px oklch(0.6 0.15 35),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.next:empty {
		display: none;
	}

	.state-row {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.strong {
		font-size: 15px;
		font-weight: 600;
	}
	.strong.bad {
		color: oklch(0.5 0.15 35);
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.small {
		font-size: 12px;
	}
	.tiny {
		font-size: 11px;
	}
	.spin {
		width: 16px;
		height: 16px;
		margin-top: 2px;
		flex: none;
		border-radius: 50%;
		border: 1.5px solid #e4e0d7;
		border-top-color: #1b1a17;
		animation: turn 0.8s linear infinite;
	}
	@keyframes turn {
		to {
			transform: rotate(1turn);
		}
	}

	/* 06 confirm. */
	.bubble {
		background: #fff;
		border-radius: 20px;
		border-top-left-radius: 6px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 12px 32px rgba(27, 26, 23, 0.08);
	}
	.said {
		font-family: 'Instrument Serif', serif;
		font-size: 22px;
		line-height: 1.3;
	}
	.guess,
	.guessed {
		font: inherit;
		font-style: italic;
		border-bottom: 1.5px dashed #a8a296;
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
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
		font-weight: 500;
	}
	.option.on {
		background: #1b1a17;
		color: #fff;
	}
	.confirm-row,
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* The roadmap: one card; the steps scroll inside it, so the page doesn't grow. */
	.roadmap {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px;
		border-radius: 20px;
		background: #fff;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.road-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.ready {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 24px;
		padding: 0 10px;
		border-radius: 999px;
		background: oklch(0.95 0.03 145);
		color: oklch(0.38 0.1 145);
		font-size: 12px;
		font-weight: 500;
	}
	.ready-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: oklch(0.6 0.15 145);
	}
	.progress {
		height: 4px;
		border-radius: 999px;
		background: #efece5;
		overflow: hidden;
	}
	.progress div {
		height: 100%;
		border-radius: inherit;
		background: oklch(0.6 0.15 145);
		transition-property: width;
		transition-duration: 400ms;
	}
	.road-frame {
		position: relative;
	}
	.road-scroll {
		max-height: min(56svh, 540px);
		overflow-y: auto;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 14px 12px 56px;
		border-radius: 16px;
		background: #f6f4ef;
		scrollbar-width: thin;
		scrollbar-color: #d6d1c6 transparent;
	}
	.road-scroll:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	/* More below: a fade, and a button that scrolls the plan, not the page. */
	.fade {
		position: absolute;
		inset: auto 0 0 0;
		height: 72px;
		border-radius: 0 0 16px 16px;
		background: linear-gradient(180deg, rgba(246, 244, 239, 0), #f6f4ef 85%);
		pointer-events: none;
	}
	.more {
		position: absolute;
		left: 50%;
		bottom: 12px;
		translate: -50% 0;
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 12px;
		font-weight: 500;
		box-shadow: 0 8px 24px rgba(27, 26, 23, 0.18);
		transition-property: scale;
		transition-duration: 150ms;
	}
	.more:active {
		scale: 0.96;
	}
	@media (prefers-reduced-motion: no-preference) {
		.road-scroll {
			scroll-behavior: smooth;
		}
	}
	.road-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.road-title {
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 36px;
		line-height: 1;
	}
	.goal {
		font-size: 15px;
		line-height: 1.5;
	}
	.milestone {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.milestone.done {
		opacity: 0.6;
	}
	.m-label {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.m-title {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 400;
		font-size: 26px;
		color: #57534b;
		line-height: 1.1;
	}
	.steps {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.step-row {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: baseline;
		padding: 10px 14px;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
		font-size: 14px;
	}
	.step-row.done .step-name {
		color: #57534b;
		text-decoration: line-through;
		text-decoration-color: #a8a296;
	}
	.check {
		color: oklch(0.45 0.12 145);
		font-size: 13px;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: #5f5a52;
	}

	/* 05 STEP · CURRENT */
	.step-card {
		background: #fff;
		border-radius: 16px;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.two {
		padding: 14px;
		border-radius: 12px;
		background: oklch(0.95 0.03 35);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.two-label {
		font-size: 11px;
		font-weight: 600;
		color: oklch(0.45 0.13 35);
		letter-spacing: 0.02em;
	}
	.two-text {
		font-family: 'Instrument Serif', serif;
		font-size: 22px;
		line-height: 1.15;
	}
	.step-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}
	.step-title {
		font-size: 15px;
		font-weight: 600;
	}
	.chips-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.chip-out,
	.chip {
		height: 26px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 12px;
		display: flex;
		align-items: center;
	}
	.chip-out {
		box-shadow: inset 0 0 0 1px #e4e0d7;
	}
	.chip {
		background: #efece5;
	}

	/* 05 PROOF: the only dark card. */
	.proof {
		position: relative;
		background: #1b1a17;
		color: #f6f4ef;
		border-radius: 16px;
		padding: 22px 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.08),
			0 16px 40px rgba(27, 26, 23, 0.18);
	}
	.proof.faded {
		opacity: 0.6;
	}
	.prove {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 44px;
		height: 44px;
		border: 1.5px solid oklch(0.68 0.15 35);
		border-radius: 6px;
		transform: rotate(6deg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-size: 15px;
		color: oklch(0.72 0.14 35);
	}
	.proof-label {
		font-size: 11px;
		letter-spacing: 0.04em;
		color: #b8b2a6;
	}
	.proof-title {
		font-family: 'Instrument Serif', serif;
		font-size: 30px;
		line-height: 1.05;
		padding-right: 48px;
	}
	.proof-text {
		font-size: 13px;
		line-height: 1.5;
		color: #cfc9bd;
	}
	.chip-dark {
		height: 26px;
		padding: 0 10px;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px #4a4740;
		font-size: 12px;
		display: flex;
		align-items: center;
	}

	/* 04 buttons. */
	.btn-ink,
	.btn-white,
	.btn-quiet {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 500;
		white-space: nowrap;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		height: 38px;
		padding: 0 20px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
	}

	.btn-white {
		height: 32px;
		padding: 0 14px;
		background: #fff;
		color: #1b1a17;
		font-size: 13px;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.btn-quiet {
		height: 32px;
		padding: 0 12px;
		color: #57534b;
		font-size: 13px;
	}

	.btn-ink:active,
	.btn-white:active,
	.btn-quiet:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.5;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	.fit-open {
		align-self: flex-start;
		font-size: 13px;
		color: #57534b;
		text-align: start;
	}
	.fit-open:hover b {
		text-decoration: underline;
	}
	.field {
		width: 100%;
		height: 42px;
		padding: 0 14px;
		border-radius: 14px;
		background: #efece5;
		font-size: 14px;
		outline: none;
	}
	.field:focus-visible {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.alt {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
	}
	.skeleton {
		height: 80px;
		border-radius: 16px;
		background: #efece5;
	}
	.skeleton.tall {
		height: 260px;
	}
	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
		}
	}
</style>
