<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { goto } from '$app/navigation';
	import { nextStepOf, placeOnToday } from '$lib/start';
	import { rise } from '$lib/motion';
	import {
		shell,
		refreshShell,
		feedMoment,
		ROOM,
		PET_STATE,
		timeOfDay,
		FLOOR,
		glassFor
	} from '$lib/shell.svelte';
	import PomodoroSheet from '$lib/components/today/PomodoroSheet.svelte';
	import ReviewsSheet from '$lib/components/today/ReviewsSheet.svelte';
	import PickSheet from '$lib/components/today/PickSheet.svelte';
	import FeedHistory from '$lib/components/today/FeedHistory.svelte';
	import PetActions from '$lib/components/shell/PetActions.svelte';
	import CapturePanel from '$lib/components/canvas/CapturePanel.svelte';

	/**
	 * Today: the pet's room. Desktop is design 12 (the room fills the window; glass top bar;
	 * greeting; the pet bottom-left; today's #1 as a glass card bottom-right). Phones are design
	 * 11 (the room on top, then the #1 card, the tiles and the capture bar), in normal flow so
	 * real text never overlaps. Tap the pet for its actions (07), the bowl for feed history (07).
	 */

	type Block = {
		missed: boolean;
		intention: string;
		startTime: string | null;
		step: { id: string; title: string; minutes: number; twoMinute: string | null; done: boolean };
		item: { id: string; title: string };
	};
	type Day = { blocks: Block[]; first: Block | null };

	const GREETING = {
		dawn: 'Good morning.',
		day: 'Good afternoon.',
		sunset: 'Good evening.',
		night: 'Still up?'
	};

	let day = $state<Day | null>(null);
	let reviewsDue = $state(0);
	let toSort = $state(0);
	/** What the user has saved, for the next step when nothing is planned. */
	let saves = $state<{ id: string; title: string; status: string; analysisError: string | null }[]>(
		[]
	);
	let guideBusy = $state<string | null>(null);
	/** Progress of what you're working on: steps done, total, and the next one. */
	let progress = $state<Record<string, { done: number; total: number; next: string | null }>>({});
	let problem = $state<string | null>(null);
	let hour = $state(13);

	let focus = $state(false);
	let reviews = $state(false);
	let picking = $state(false);
	/** Past the user's shutdown time: offer to wrap up the day. */
	let wrapDue = $state(false);
	/** Just started something: its plan is ready and its first step is below. */
	let started = $state<string | null>(null);
	let feed = $state(false);
	let actions = $state(false);
	let panel = $state(false);
	let voice = $state(false);
	let text = $state('');
	let saving = $state(false);
	let saved = $state(false);
	/** What was just saved: shown with what happens next and a link to it. */
	let justSaved = $state<{ id: string; title: string } | null>(null);

	const tod = $derived(timeOfDay(hour));
	const dark = $derived(tod !== 'day');
	const glass = $derived(glassFor(tod));
	const p = $derived(shell.pet);
	const petState = $derived(p ? (PET_STATE[p.mood] ?? 'happy') : 'egg');
	const room = $derived(ROOM[petState] ?? ROOM.happy);
	const name = $derived(p?.pet.name ?? 'Your pet');
	const first = $derived(day?.first ?? null);
	const c = $derived(shell.credits);
	const freePct = $derived(c ? Math.round((c.freeLeftToday / Math.max(1, c.freeDaily)) * 100) : 0);
	const heroLabel = $derived(
		first ? (first.missed ? "TODAY'S #1 · 2-MINUTE VERSION" : "TODAY'S #1") : 'NEXT STEP'
	);
	const heroTime = $derived(
		first
			? first.missed
				? '2 min'
				: `${first.startTime ? first.startTime.slice(0, 5) + ' · ' : ''}${first.step.minutes} min`
			: ''
	);
	const heroText = $derived(
		first
			? first.missed
				? (first.step.twoMinute ?? first.step.title)
				: first.intention
			: 'Nothing planned for today.'
	);
	const heroSub = $derived(
		first
			? first.missed
				? "Yesterday's step, made small. It still counts."
				: first.step.twoMinute
					? `Start here: ${first.step.twoMinute}`
					: first.step.title
			: 'Sort what you saved and keep one thing to start.'
	);

	/**
	 * When nothing is planned: the one next step, in order. Reading → sort → start one → put its
	 * first step on today → (nothing saved) save something.
	 */
	const guide = $derived.by(() => {
		const working = saves.filter((s) => s.status === 'focus');
		const kept = saves.filter((s) => s.status === 'shortlist' || s.status === 'paused');
		const reading = saves.filter((s) => s.status === 'inbox' && !s.analysisError);
		if (working.length)
			return {
				kind: 'place' as const,
				text: `Put the next step of "${working[0].title}" on today.`,
				sub: 'You started it. Its plan is ready (or nearly): this puts the next step here.',
				cta: 'Plan today',
				id: working[0].id
			};
		if (toSort)
			return {
				kind: 'sort' as const,
				text: `${toSort} ${toSort === 1 ? 'thing is' : 'things are'} ready to sort.`,
				sub: 'One at a time: keep it, keep it for later, or let it go. About two minutes.',
				cta: 'Sort them'
			};
		if (kept.length)
			return {
				kind: 'start' as const,
				text: `Start one of your ${kept.length} kept ${kept.length === 1 ? 'thing' : 'things'}.`,
				sub: 'Starting makes a plan and puts its first step here.',
				cta: 'Choose one'
			};
		if (reading.length)
			return {
				kind: 'reading' as const,
				text: `${name} is reading your ${reading.length} ${reading.length === 1 ? 'thing' : 'things'}.`,
				sub: "They'll be ready to sort in a minute. This updates by itself.",
				cta: null
			};
		return {
			kind: 'save' as const,
			text: 'Save something you want to make, learn or try.',
			sub: 'A link, a note, an image or a voice note. Your pet reads it and finds a first step.',
			cta: 'Save something'
		};
	});

	// While things are being read or planned, check again every few seconds.
	$effect(() => {
		if (first || (guide.kind !== 'reading' && guide.kind !== 'place')) return;
		const t = setInterval(load, 6000);
		return () => clearInterval(t);
	});

	async function followGuide() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
		if (guide.kind === 'sort') return goto(`${resolve('/app')}?sort=1`);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
		if (guide.kind === 'start') return goto(`${resolve('/app')}?view=shortlist`);
		if (guide.kind === 'save') {
			const box = document.querySelector<HTMLInputElement>(
				innerWidth <= 760 ? '.capture.bottom input' : '.capture.top input'
			);
			box?.focus();
			return;
		}
		if (guide.kind === 'place') {
			guideBusy = 'Getting the next step…';
			try {
				const step = await nextStepOf(guide.id);
				if (step && 'error' in step) guideBusy = step.error;
				else if (!step) guideBusy = 'The plan is still being made. This updates by itself.';
				else {
					await placeOnToday(step.id);
					guideBusy = null;
					await load();
				}
			} catch (e) {
				guideBusy = null;
				failed(e);
			}
		}
	}

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=/today`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			const [d, r, i] = await Promise.all([
				api<Day>('/api/plan/day'),
				api<{ dueTotal: number }>('/api/reviews').catch(() => ({ dueTotal: 0 })),
				api<{
					items: { id: string; title: string; status: string; analysisError: string | null }[];
				}>('/api/items').catch(() => ({ items: [] }))
			]);
			day = d;
			reviewsDue = r.dueTotal;
			toSort = i.items.filter((x) => x.status === 'ready').length;
			saves = i.items;
			for (const w of i.items.filter((x) => x.status === 'focus').slice(0, 4)) {
				api<{
					roadmap: {
						doneSteps: number;
						totalSteps: number;
						currentStep: { title: string } | null;
					} | null;
				}>(`/api/items/${w.id}/roadmap`).then(
					(r) => {
						if (r.roadmap)
							progress[w.id] = {
								done: r.roadmap.doneSteps,
								total: r.roadmap.totalSteps,
								next: r.roadmap.currentStep?.title ?? null
							};
					},
					() => {}
				);
			}
			api<{ due: boolean }>('/api/plan/shutdown').then(
				(w) => (wrapDue = w.due),
				() => {}
			);
		} catch (e) {
			failed(e);
		}
	}

	onMount(() => {
		const d = new Date();
		hour = d.getHours() + d.getMinutes() / 60;
		void load();
		// Arriving from the pet's actions or the menu: open what was asked for.
		const q = new URL(location.href).searchParams;
		if (q.has('reviews')) reviews = true;
		if (q.has('pick')) picking = true;
		started = q.get('started');
		if (q.has('focus')) {
			const wait = setInterval(() => {
				if (day) {
					clearInterval(wait);
					focus = true;
				}
			}, 100);
			setTimeout(() => clearInterval(wait), 8000);
		}
	});

	let finishing = $state(false);
	async function done() {
		if (!first || finishing) return;
		finishing = true;
		try {
			await api(`/api/steps/${first.step.id}/complete`, 'POST');
			feedMoment();
			await load();
		} catch (e) {
			failed(e);
		} finally {
			finishing = false;
		}
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		const words = text.trim();
		if (!words) {
			voice = false;
			panel = !panel;
			return;
		}
		saving = true;
		try {
			const { item } = await api<{ item: { id: string; title: string } }>(
				'/api/items',
				'POST',
				/^https?:\/\/\S+$/i.test(words)
					? { captureType: 'url', sourceUrl: words }
					: { captureType: 'note', note: words }
			);
			text = '';
			saved = true;
			setTimeout(() => (saved = false), 2400);
			justSaved = { id: item.id, title: item.title };
			void refreshShell();
			void load();
		} catch (err) {
			failed(err);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Today · createthings</title>
</svelte:head>

{#snippet captureBar(variant: 'top' | 'bottom')}
	<form class="capture {variant}" onsubmit={save}>
		<input
			bind:value={text}
			placeholder={saved
				? 'Saved.'
				: variant === 'top'
					? 'What do you want to make, learn or try?'
					: 'What do you want to make…'}
			aria-label="What do you want to make, learn or try?"
		/>
		{#if variant === 'bottom'}
			<button
				type="button"
				class="mic"
				aria-label="Talk it out, 2 credits"
				onclick={() => ((voice = true), (panel = true))}
			>
				<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"
					><path
						d="M10 3a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 10 3Z M5 9.5a5 5 0 0 0 10 0 M10 14.5V17"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/></svg
				>
			</button>
		{/if}
		<button class="plus" disabled={saving} aria-label={text.trim() ? 'Save' : 'More ways to add'}
			>+</button
		>
	</form>
{/snippet}

<div class="today" class:dark>
	<!-- The room -->
	<section class="room" aria-label="{name}'s room">
		<div class="fill" data-ct data-hour={hour} data-weather="clear">
			<ct-weather class="fill"></ct-weather>
		</div>
		<div
			class="floor"
			style:background="linear-gradient(180deg,rgba(0,0,0,0) 0%,{FLOOR[tod]} 75%)"
		></div>
		<div
			class="fill no-touch"
			data-ct
			data-level={room.dust}
			data-webs={room.webs}
			data-fog="0"
			data-tone={dark ? 'dark' : 'light'}
			data-seed="21"
		>
			<ct-grime class="fill"></ct-grime>
		</div>
		<div class="bed" aria-hidden="true"></div>
		<button
			class="bowl"
			aria-label="Feed history"
			style:background={petState === 'happy' ? 'oklch(0.85 0.06 70)' : 'transparent'}
			onclick={() => (feed = true)}
		></button>
		<button class="pet" aria-label="What you can do with {name}" onclick={() => (actions = true)}>
			<span
				class="fill"
				data-ct
				data-species={p?.pet.species ?? 'dog'}
				data-state={petState}
				data-action={tod === 'night' ? 'sleep' : shell.action}
			>
				{#if shell.loaded}<ct-kawaii class="fill"></ct-kawaii>{/if}
			</span>
		</button>

		<div class="words">
			<div class="small" style:color={dark ? '#E4DED3' : '#57534B'}>
				<span class="on-phone">{GREETING[tod]}</span><span class="on-desk"
					>{p ? room.short(name) : 'Meet your pet'}</span
				>
			</div>
			<div class="big" style:color={dark ? '#F6F4EF' : '#1B1A17'}>
				<span class="on-phone">{p ? room.title(name) : 'Meet your pet'}</span><span class="on-desk"
					>{GREETING[tod]}</span
				>
			</div>
		</div>

		{#if p?.why}
			<div
				class="bubble"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				style:color={glass.ink}
			>
				{p.why}
			</div>
		{/if}

		<!-- Top: design 12 glass bar on desktop, design 11 seal and credits on phones -->
		<div class="bar">
			<button
				class="brand"
				aria-expanded={shell.menu}
				aria-controls="storyboard"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				style:color={glass.ink}
				onclick={() => (shell.menu = !shell.menu)}
			>
				<span class="seal">ct</span><span class="brand-name">createthings</span>
			</button>
			<div
				class="bar-capture"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
			>
				{@render captureBar('top')}
			</div>
			{#if c}
				<div
					class="credits"
					style:background={glass.bg}
					style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
					style:color={glass.ink}
				>
					<span
						class="ring"
						style:background="conic-gradient(currentColor 0 {freePct}%,rgba(128,128,128,.35) {freePct}%
						100%)"
					></span>{c.freeLeftToday} free
				</div>
			{/if}
		</div>
	</section>

	<!-- Today's #1, reviews and things to sort -->
	<section class="panel" aria-label="Today">
		{#if started}
			<div class="started" role="status">
				<span>Your plan for “{started}” is ready. Here's your first step.</span>
				<button aria-label="Close" onclick={() => (started = null)}>×</button>
			</div>
		{/if}
		<div class="hero">
			{#if problem}
				<div class="hero-text">{problem}</div>
				<div class="actions"><button class="cta" onclick={load}>Try again</button></div>
			{:else}
				<div class="hero-top">
					<span class="hero-label"><span class="dot"></span>{heroLabel}</span>
					<span class="hero-time">{heroTime}</span>
				</div>
				<div class="hero-text">{!day ? '…' : first ? heroText : guide.text}</div>
				<div class="hero-sub">{!day ? '' : first ? heroSub : (guideBusy ?? guide.sub)}</div>
				{#if wrapDue}
					<a class="part-of" href="{resolve('/plan')}?wrap=1"
						>It's the end of your day · wrap up and set tomorrow's top 3 →</a
					>
				{/if}
				{#if first}
					<a class="part-of" href={resolve(`/things/${first.item.id}`)}
						>Part of “{first.item.title}” · see the plan →</a
					>
				{/if}
				<div class="actions">
					{#if first}
						<button class="cta" onclick={() => (focus = true)}
							>{first.missed ? 'Start · 2 min' : 'Start pomodoro'}</button
						>
						<button class="done" disabled={finishing} onclick={done}>Done</button>
					{:else if day && guide.cta}
						<button class="cta" onclick={followGuide}>{guide.cta}</button>
						{#if guide.kind === 'start'}
							<button class="done" onclick={() => (picking = true)}>Pick for me · 1 cr</button>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Everything going on, each row leading where you act on it -->
		<nav class="going" aria-label="What's going on">
			<p class="going-label">What's going on</p>
			{#each saves.filter((x) => x.status === 'focus').slice(0, 4) as w (w.id)}
				{@const pr = progress[w.id]}
				<a class="going-row" href={resolve(`/things/${w.id}`)}>
					<span class="going-text">
						<span class="going-title">Working on: {w.title}</span>
						<span class="going-sub"
							>{pr
								? `${pr.done} of ${pr.total} steps done${pr.next ? ` · next: ${pr.next}` : ''}`
								: 'See its plan'}</span
						>
					</span>
					<span class="going-go" aria-hidden="true">→</span>
				</a>
			{/each}
			{#if toSort}
				<a class="going-row" href="{resolve('/app')}?sort=1">
					<span class="going-text">
						<span class="going-title">{toSort} new {toSort === 1 ? 'thing' : 'things'} to sort</span
						>
						<span class="going-sub"
							>Keep it, keep it for later, or let it go. About two minutes.</span
						>
					</span>
					<span class="going-go" aria-hidden="true">→</span>
				</a>
			{/if}
			{#if saves.some((x) => x.status === 'inbox' && !x.analysisError)}
				{@const n = saves.filter((x) => x.status === 'inbox' && !x.analysisError).length}
				<a class="going-row" href={resolve('/app')}>
					<span class="going-text">
						<span class="going-title">{n} being read by {name}</span>
						<span class="going-sub">Working out what each one is and how big it is.</span>
					</span>
					<span class="going-go" aria-hidden="true">→</span>
				</a>
			{/if}
			{#if saves.some((x) => x.status === 'shortlist' || x.status === 'paused')}
				{@const n = saves.filter((x) => x.status === 'shortlist' || x.status === 'paused').length}
				<a class="going-row" href="{resolve('/app')}?view=shortlist">
					<span class="going-text">
						<span class="going-title">{n} kept, waiting to start</span>
						<span class="going-sub">Open one and start it when you're ready.</span>
					</span>
					<span class="going-go" aria-hidden="true">→</span>
				</a>
			{/if}
			{#if reviewsDue}
				<button class="going-row" onclick={() => (reviews = true)}>
					<span class="going-text">
						<span class="going-title"
							>{reviewsDue} {reviewsDue === 1 ? 'question' : 'questions'} on what you learned</span
						>
						<span class="going-sub">Quick recall, so it sticks. A minute or two; feeds {name}.</span
						>
					</span>
					<span class="going-go" aria-hidden="true">→</span>
				</button>
			{/if}
			<a class="going-row quiet" href={resolve('/app')}>
				<span class="going-text">
					<span class="going-title">All your things</span>
					<span class="going-sub"
						>{saves.filter((x) => x.status !== 'archived').length} saved, on your canvas</span
					>
				</span>
				<span class="going-go" aria-hidden="true">→</span>
			</a>
		</nav>
	</section>

	<div class="bottom">{@render captureBar('bottom')}</div>
</div>

{#if justSaved}
	<div
		class="saved-card"
		role="status"
		in:rise={{ y: -10, scale: 0.98, duration: 220 }}
		out:rise={{ y: -10, duration: 160 }}
	>
		<p class="saved-title"><span class="saved-strong">Saved.</span> {justSaved.title}</p>
		<p class="saved-sub">
			{name} is reading it: what it is, how big, and what you're trying to do. Then you can start it.
		</p>
		<div class="saved-row">
			<a class="saved-go" href={resolve(`/things/${justSaved.id}`)}>See it</a>
			<a class="saved-fit" href="{resolve(`/things/${justSaved.id}`)}?fit=1">Fit it in</a>
			<button class="saved-close" onclick={() => (justSaved = null)}>Close</button>
		</div>
	</div>
{/if}

{#if panel}
	<div class="catch" role="presentation" onclick={() => ((panel = false), (voice = false))}></div>
	<div class="panel-pos">
		<CapturePanel
			startVoice={voice}
			onimage={() => (window.location.href = resolve('/app'))}
			onwant={() => ((panel = false), (text = 'I want to '))}
			onsaved={() => ((saved = true), setTimeout(() => (saved = false), 2400))}
			onclose={() => ((panel = false), (voice = false))}
		/>
	</div>
{/if}
{#if actions}<PetActions onclose={() => (actions = false)} />{/if}
{#if feed}<FeedHistory onclose={() => (feed = false)} />{/if}
{#if picking}<PickSheet onclose={() => (picking = false)} onstarted={load} />{/if}
{#if reviews}<ReviewsSheet onclose={() => ((reviews = false), load())} onerror={failed} />{/if}
{#if focus}
	<PomodoroSheet
		stepId={first?.step.id ?? null}
		stepTitle={first?.step.title ?? null}
		pet={p ? { name, species: p.pet.species } : null}
		onclose={() => ((focus = false), load())}
		onfed={feedMoment}
		onerror={failed}
	/>
{/if}

<style>
	.today {
		position: relative;
		min-height: 100svh;
		background: #f6f4ef;
		color: #1b1a17;
		font-family: 'Geist', sans-serif;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.no-touch {
		pointer-events: none;
	}

	/* ---------- Desktop: design 12, the room fills the window ---------- */
	.room {
		position: relative;
		height: 100svh;
		min-height: 560px;
		overflow: hidden;
		background: #b9c8d8;
	}
	.floor {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: 34%;
	}
	.pet {
		position: absolute;
		inset-inline-start: 3%;
		bottom: 2%;
		width: min(340px, 36%);
		height: 64%;
		cursor: pointer;
	}
	.bed {
		position: absolute;
		inset-inline-start: 4%;
		bottom: 3%;
		width: min(300px, 30%);
		height: 44px;
		border-radius: 50%;
		background: rgba(27, 26, 23, 0.07);
		box-shadow: inset 0 0 0 1.5px rgba(87, 83, 75, 0.3);
	}
	.bowl {
		position: absolute;
		inset-inline-start: calc(3% + min(340px, 36%));
		bottom: 5%;
		width: 60px;
		height: 20px;
		border-radius: 0 0 30px 30px;
		box-shadow: inset 0 0 0 1.5px rgba(87, 83, 75, 0.45);
		cursor: pointer;
	}
	.words {
		position: absolute;
		inset-inline: 40% 5%;
		top: 22%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.small {
		font-size: 14px;
	}
	.big {
		font-family: 'Instrument Serif', serif;
		font-size: clamp(48px, 6.5vw, 84px);
		line-height: 1;
		letter-spacing: -0.02em;
	}
	.on-phone {
		display: none;
	}
	/* 07: one bubble, tail toward the pet, never over a button. */
	.bubble {
		position: absolute;
		inset-inline-start: calc(3% + min(250px, 26%));
		bottom: 50%;
		max-width: min(280px, 30%);
		padding: 10px 12px;
		border-radius: 16px;
		border-end-start-radius: 5px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		font-size: 13px;
		line-height: 1.4;
	}
	.bar {
		position: absolute;
		inset-inline: 18px;
		top: 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.brand,
	.credits,
	.bar-capture {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		border-radius: 999px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
	}
	.brand {
		padding: 0 14px 0 8px;
		font-size: 13px;
		font-weight: 600;
	}
	.seal {
		width: 24px;
		height: 24px;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 14px;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
		background: rgba(255, 255, 255, 0.5);
	}
	.bar-capture {
		flex: 1;
		max-width: 420px;
	}
	.credits {
		padding: 0 14px;
		font-size: 12px;
	}
	.ring {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	.capture {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}
	.capture.top {
		height: 40px;
		padding: 0 6px 0 16px;
	}
	.capture input {
		flex: 1;
		min-width: 0;
		background: transparent;
		outline: none;
		font-size: 13px;
		color: inherit;
	}
	.capture.top input {
		color: #1b1a17;
	}
	.dark .capture.top input {
		color: #f6f4ef;
	}
	.capture input::placeholder {
		color: currentColor;
		opacity: 0.7;
	}
	.capture.top .plus {
		width: 28px;
		height: 28px;
		font-size: 14px;
	}
	.plus {
		flex: none;
		border-radius: 50%;
		background: #1b1a17;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dark .capture.top .plus {
		background: #f6f4ef;
		color: #1b1a17;
	}

	/* The #1 card and tiles: glass over the sky, bottom-right (design 12). */
	.panel {
		max-height: calc(100svh - 96px);
		overflow-y: auto;
		position: absolute;
		inset-inline-end: 4%;
		bottom: 6%;
		width: min(380px, 52%);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.hero {
		padding: 20px;
		border-radius: 22px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.65),
			0 8px 24px rgba(27, 26, 23, 0.12);
	}
	.dark .hero {
		background: rgba(22, 24, 38, 0.42);
		color: #f6f4ef;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.14),
			0 8px 24px rgba(27, 26, 23, 0.12);
	}
	.started {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 14px;
		background: oklch(0.95 0.03 145);
		color: oklch(0.36 0.1 145);
		font-size: 13px;
		font-weight: 500;
	}
	.started button {
		font-size: 16px;
		line-height: 1;
	}
	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.hero-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: oklch(0.6 0.15 35);
	}
	.hero-time {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		opacity: 0.75;
	}
	.hero-text {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		line-height: 1.2;
	}
	.hero-sub {
		font-size: 13px;
		line-height: 1.45;
		opacity: 0.8;
	}
	.part-of {
		font-size: 12px;
		opacity: 0.8;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	.cta {
		height: 36px;
		padding: 0 18px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.dark .cta {
		background: #f6f4ef;
		color: #1b1a17;
	}
	.done {
		height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		background: transparent;
		box-shadow: inset 0 0 0 1px rgba(27, 26, 23, 0.2);
		font-size: 14px;
		font-weight: 500;
		color: inherit;
	}
	.dark .done {
		box-shadow: inset 0 0 0 1px rgba(246, 244, 239, 0.4);
	}
	.going {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.65),
			0 8px 24px rgba(27, 26, 23, 0.12);
	}
	.dark .going {
		background: rgba(22, 24, 38, 0.42);
		color: #f6f4ef;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.14),
			0 8px 24px rgba(27, 26, 23, 0.12);
	}
	.going-label {
		padding: 6px 10px 2px;
		font-size: 11px;
		font-weight: 600;
		opacity: 0.75;
	}
	.going-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border-radius: 12px;
		text-align: start;
		transition-property: background-color, scale;
		transition-duration: 150ms;
	}
	@media (hover: hover) and (pointer: fine) {
		.going-row:hover {
			background: rgba(255, 255, 255, 0.45);
		}
		.dark .going-row:hover {
			background: rgba(255, 255, 255, 0.08);
		}
	}
	.going-row:active {
		scale: 0.98;
	}
	.going-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.going-title {
		font-size: 13px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.going-sub {
		font-size: 12px;
		line-height: 1.35;
		opacity: 0.8;
	}
	.going-row.quiet .going-title {
		font-weight: 500;
	}
	.going-go {
		flex: none;
		opacity: 0.6;
	}
	.tiles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 14px;
		border-radius: 18px;
		text-align: start;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
	}
	.dark .tile {
		background: rgba(22, 24, 38, 0.42);
		color: #f6f4ef;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
	}
	.tile-n {
		font-family: 'Instrument Serif', serif;
		font-size: 26px;
		line-height: 1;
	}
	.tile-l {
		font-size: 12px;
		opacity: 0.8;
	}
	.bottom {
		display: none;
	}

	/* Press feedback. */
	.brand,
	.cta,
	.done,
	.tile,
	.plus,
	.mic,
	.pet,
	.bowl {
		transition: transform var(--dur-press) var(--ease-out);
	}
	.brand:active,
	.cta:active,
	.done:active,
	.tile:active,
	.plus:active,
	.mic:active,
	.bowl:active {
		transform: scale(0.96);
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	/* Typing: the whole rounded bar gets the 2px ink ring (04), never a box inside it. */
	.bar-capture:focus-within {
		box-shadow:
			0 0 0 2px #1b1a17,
			0 8px 24px rgba(27, 26, 23, 0.12) !important;
	}
	.dark .bar-capture:focus-within {
		box-shadow:
			0 0 0 2px #f6f4ef,
			0 8px 24px rgba(27, 26, 23, 0.12) !important;
	}
	.capture.bottom:focus-within {
		box-shadow:
			0 0 0 2px #1b1a17,
			0 12px 30px rgba(27, 26, 23, 0.14);
	}
	.capture input:focus,
	.capture input:focus-visible {
		outline: none;
	}

	/* After a save: what happens next, and where to see it. */
	.saved-card {
		position: fixed;
		z-index: 30;
		top: 72px;
		left: 50%;
		translate: -50% 0;
		width: min(380px, calc(100% - 24px));
		padding: 14px 16px;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: rgba(255, 255, 255, 0.82);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.8),
			0 0 0 1px rgba(27, 26, 23, 0.06),
			0 16px 40px rgba(27, 26, 23, 0.18);
		color: #1b1a17;
	}
	.saved-title {
		font-size: 14px;
		line-height: 1.35;
	}
	.saved-strong {
		font-weight: 600;
	}
	.saved-sub {
		font-size: 12px;
		line-height: 1.45;
		color: #57534b;
	}
	.saved-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.saved-go {
		height: 32px;
		padding: 0 16px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
	}
	.saved-fit {
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 13px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
	}
	.saved-close {
		height: 32px;
		padding: 0 12px;
		font-size: 13px;
		color: #57534b;
	}
	@media (max-width: 760px) {
		.saved-card {
			top: auto;
			bottom: calc(92px + env(safe-area-inset-bottom));
		}
	}
	.catch {
		position: fixed;
		inset: 0;
		z-index: 24;
	}

	/* ---------- Phones: design 11, in normal flow ---------- */
	/* The greeting at 40% and the #1 card stop fitting side by side here. */
	@media (max-width: 760px) {
		.room {
			height: 440px;
			min-height: 0;
			border-radius: 0 0 36px 36px;
		}
		.floor {
			height: 150px;
		}
		.pet {
			inset-inline-start: 14px;
			bottom: 36px;
			width: 190px;
			height: 190px;
		}
		.bed {
			inset-inline-start: 28px;
			bottom: 58px;
			width: 150px;
			height: 34px;
		}
		.bowl {
			inset-inline-start: auto;
			inset-inline-end: 40px;
			bottom: 64px;
			width: 44px;
			height: 15px;
			border-radius: 0 0 22px 22px;
		}
		.words {
			inset-inline: 22px 22px;
			top: 110px;
			gap: 4px;
		}
		.small {
			font-size: 12px;
		}
		.big {
			font-size: 34px;
		}
		.on-phone {
			display: inline;
		}
		.on-desk {
			display: none;
		}
		.bubble {
			inset-inline-start: 184px;
			bottom: 200px;
			max-width: min(186px, calc(100% - 200px));
		}
		.bar {
			inset-inline: 16px;
			top: calc(16px + env(safe-area-inset-top));
		}
		.brand {
			width: 34px;
			height: 34px;
			padding: 0;
			justify-content: center;
			border-radius: 10px;
		}
		.brand-name,
		.bar-capture {
			display: none;
		}
		.credits {
			height: 32px;
			padding: 0 12px 0 9px;
		}
		/* The #1 card: white with the seal ring, overlapping the room's edge (design 11). */
		.panel {
			position: relative;
			inset: auto;
			width: auto;
			margin: -28px 16px 0;
			padding-bottom: calc(100px + env(safe-area-inset-bottom));
			flex-direction: column;
		}
		.hero,
		.dark .hero {
			background: #fff;
			color: #1b1a17;
			backdrop-filter: none;
			border-radius: 22px;
			padding: 18px;
			gap: 14px;
			box-shadow:
				0 0 0 1.5px oklch(0.6 0.15 35),
				0 12px 30px rgba(27, 26, 23, 0.12);
		}
		.hero-label {
			color: oklch(0.48 0.14 35);
		}
		.hero-text {
			font-size: 25px;
			line-height: 1.15;
		}
		.cta,
		.dark .cta {
			flex: 1;
			height: 42px;
			background: #1b1a17;
			color: #fff;
			font-size: 15px;
		}
		.done,
		.dark .done {
			height: 42px;
			padding: 0 16px;
			background: #fff;
			box-shadow: 0 0 0 1px #e4e0d7;
			color: #1b1a17;
		}
		.going,
		.dark .going {
			background: #fff;
			color: #1b1a17;
			backdrop-filter: none;
			box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
		}
		.tile,
		.dark .tile {
			background: #fff;
			color: #1b1a17;
			backdrop-filter: none;
			box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
		}
		.bottom {
			display: block;
			position: fixed;
			z-index: 20;
			inset-inline: 16px;
			bottom: calc(26px + env(safe-area-inset-bottom));
		}
		.capture.bottom {
			height: 52px;
			padding: 0 6px 0 18px;
			gap: 10px;
			border-radius: 999px;
			background: rgba(255, 255, 255, 0.62);
			backdrop-filter: blur(18px) saturate(1.4);
			-webkit-backdrop-filter: blur(18px) saturate(1.4);
			box-shadow:
				inset 0 0 0 1px rgba(255, 255, 255, 0.7),
				0 0 0 1px rgba(27, 26, 23, 0.06),
				0 12px 30px rgba(27, 26, 23, 0.14);
			color: #1b1a17;
		}
		.capture.bottom input {
			font-size: 16px;
			color: #1b1a17;
		}
		.capture.bottom input::placeholder {
			color: #57534b;
			opacity: 1;
		}
		.mic {
			width: 40px;
			height: 40px;
			flex: none;
			border-radius: 50%;
			background: rgba(27, 26, 23, 0.06);
			display: flex;
			align-items: center;
			justify-content: center;
			color: #57534b;
		}
		.capture.bottom .plus {
			width: 40px;
			height: 40px;
			font-size: 18px;
		}
		.panel-pos :global(.panel) {
			top: auto;
			bottom: calc(90px + env(safe-area-inset-bottom));
			transform-origin: bottom center;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.brand,
		.cta,
		.done,
		.tile,
		.plus,
		.mic,
		.bowl {
			transition: none;
		}
	}
</style>
