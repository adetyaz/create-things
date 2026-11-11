<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { fade } from 'svelte/transition';

	/**
	 * Onboarding in three short steps: what you're into → your pet → what's on your mind (optional).
	 * Everything else (rhythm, how strict, tone) uses the defaults and stays editable in settings.
	 */

	type Template = { id: string; label: string; blurb: string };
	type Breed = { id: string; label: string; personality: string; voice: { gentle: string } };
	type Species = { id: string; label: string; food: string; breeds: Breed[] };
	type Onboarding = {
		done: boolean;
		ask: 'types' | 'sentence' | 'both';
		maxTypes: number;
		templates: Template[];
		species: Species[];
	};
	/** The pet that came back: the new one, or the one this person already had. */
	type Finished = {
		pet: { pet: { name: string; species: string } } | null;
		saved: { id: string; title: string | null }[];
	};

	const EXTENSION_URL =
		'https://chromewebstore.google.com/detail/createthings/inemmheangfaedcdcmjgdobaopjcmeea';
	/** The pets with a 3D look (design system section 07). */
	const PET_IDS = ['dog', 'cat', 'rabbit', 'bird'];
	const NAME_IDEAS: Record<string, string> = {
		dog: 'Biscuit',
		cat: 'Miso',
		rabbit: 'Clover',
		bird: 'Pip'
	};
	const MAX_THINGS = 3;
	const ANALYSIS_COST = 2;

	let data = $state<Onboarding | null>(null);
	let problem = $state<string | null>(null);
	let step = $state<'types' | 'pet' | 'mind' | 'done'>('types');
	let busy = $state(false);

	let picked = $state<string[]>([]);
	let sentence = $state('');
	let suggestNote = $state<string | null>(null);

	let speciesId = $state('dog');
	let name = $state('');
	let nameTouched = $state(false);

	let things = $state(['', '', '']);
	let finished = $state<Finished | null>(null);

	const pets = $derived((data?.species ?? []).filter((s) => PET_IDS.includes(s.id)));
	const species = $derived(pets.find((s) => s.id === speciesId));
	const breed = $derived(species?.breeds[0]);
	const petName = $derived(name.trim() || NAME_IDEAS[speciesId] || 'Buddy');
	const filled = $derived(things.map((t) => t.trim()).filter(Boolean));
	const homeName = $derived(finished?.pet?.pet.name ?? petName);
	const homeSpecies = $derived(finished?.pet?.pet.species ?? speciesId);
	const stepNumber = $derived(step === 'types' ? 1 : step === 'pet' ? 2 : 3);

	function fail(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			// Sign-in is on and this visitor isn't signed in: sign in, then come back here.
			window.location.assign(`${resolve('/signin')}?next=/start`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			data = await api<Onboarding>('/api/onboarding');
		} catch (e) {
			fail(e);
		}
	}

	onMount(() => {
		load();
		import('$lib/ct/ct-kawaii.js');
	});

	function toggle(id: string) {
		if (picked.includes(id)) picked = picked.filter((p) => p !== id);
		else if (data && data.maxTypes === 1) picked = [id];
		else if (data && picked.length < data.maxTypes) picked = [...picked, id];
	}

	async function suggest(e: SubmitEvent) {
		e.preventDefault();
		if (sentence.trim().length < 3) return;
		busy = true;
		suggestNote = null;
		try {
			const res = await api<{ templates: Template[] }>('/api/onboarding/suggest', 'POST', {
				sentence
			});
			const known = new Set(data?.templates.map((t) => t.id));
			picked = res.templates
				.map((t) => t.id)
				.filter((id) => known.has(id))
				.slice(0, data?.maxTypes ?? 3);
			suggestNote = picked.length
				? 'Picked for you below. Change them if they feel off.'
				: 'No close match. Pick what fits below.';
		} catch (err) {
			fail(err);
		} finally {
			busy = false;
		}
	}

	function choosePet(id: string) {
		speciesId = id;
		if (!nameTouched) name = '';
	}

	async function finish(withThings: boolean) {
		if (!breed) return;
		busy = true;
		problem = null;
		try {
			finished = await api<Finished>('/api/onboarding', 'POST', {
				templates: picked,
				pet: { species: speciesId, breed: breed.id, name: petName },
				brainDump: withThings && filled.length ? filled : undefined
			});
			step = 'done';
		} catch (e) {
			fail(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Get started · createthings</title>
</svelte:head>

<div class="page min-h-svh">
	<header class="mx-auto flex w-full max-w-[640px] items-center justify-between px-4 pt-5 sm:px-6">
		<a
			href={resolve('/')}
			class="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]"
		>
			<span class="seal" aria-hidden="true">ct</span>
			createthings
		</a>
		{#if step !== 'done'}
			<p class="font-mono text-[12px] text-ink-3" aria-live="polite">Step {stepNumber} of 3</p>
		{/if}
	</header>

	<main class="mx-auto w-full max-w-[640px] px-4 pt-8 pb-36 sm:px-6 sm:pt-12">
		{#if problem}
			<div class="card mb-6 flex flex-col gap-3 p-5" role="alert">
				<p class="text-[15px] leading-[1.5]">{problem}</p>
				<div>
					<button class="btn-quiet" onclick={() => (data ? (problem = null) : load())}>
						{data ? 'OK' : 'Try again'}
					</button>
				</div>
			</div>
		{/if}

		{#key step + String(!!data)}
			<div in:fade={{ duration: 200 }}>
				{#if !data && !problem}
					<div class="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
						<div class="skeleton h-12 w-3/4"></div>
						<div class="skeleton h-5 w-1/2"></div>
						<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each [0, 1, 2, 3] as i (i)}<div class="skeleton h-20"></div>{/each}
						</div>
					</div>
				{:else if data && data.done && step !== 'done'}
					<h1 class="title">You're already set up.</h1>
					<p class="lead">Your pet is waiting. You can go through this again to change things.</p>
					<div class="mt-6 flex flex-wrap gap-2.5">
						<a href={resolve('/today')} class="btn-ink">Go to today</a>
						<button class="btn-quiet" onclick={() => data && (data.done = false)}
							>Set up again</button
						>
					</div>
				{:else if data && step === 'types'}
					<h1 class="title">What are you into?</h1>
					<p class="lead">
						Pick up to {data.maxTypes === 1 ? 'one' : data.maxTypes}. It sets how your pet plans
						with you. You can change it any time.
					</p>

					{#if data.ask !== 'types'}
						<form class="mt-6 flex gap-2" onsubmit={suggest}>
							<label class="sr-only" for="sentence">Describe yourself in a sentence</label>
							<input
								id="sentence"
								class="input flex-1"
								placeholder="Or say it in a sentence: I make jewellery and…"
								bind:value={sentence}
								maxlength="500"
							/>
							<button class="btn-soft shrink-0" disabled={busy || sentence.trim().length < 3}>
								Suggest <span class="font-mono text-[11px] text-ink-3">free</span>
							</button>
						</form>
						{#if suggestNote}<p class="mt-2 text-[13px] text-ink-2" aria-live="polite">
								{suggestNote}
							</p>{/if}
					{/if}

					<ul class="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{#each data.templates as t (t.id)}
							{@const on = picked.includes(t.id)}
							<li>
								<button
									class="option card w-full p-4 text-left"
									class:on
									aria-pressed={on}
									onclick={() => toggle(t.id)}
								>
									<span class="block text-[15px] font-semibold tracking-[-0.01em]">{t.label}</span>
									<span class="mt-1 block text-[13px] leading-[1.45] text-ink-2">{t.blurb}</span>
								</button>
							</li>
						{/each}
					</ul>

					<div class="actions">
						<span class="text-[13px] text-ink-3">
							{picked.length ? `${picked.length} picked` : 'None picked: you start as an explorer'}
						</span>
						<button class="btn-ink" onclick={() => (step = 'pet')}>Next</button>
					</div>
				{:else if data && step === 'pet'}
					<h1 class="title">Pick your pet.</h1>
					<p class="lead">
						It eats when you do what you said you would. Skip a few days and it gets hungry.
					</p>

					<div
						class="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
						role="radiogroup"
						aria-label="Pet"
					>
						{#each pets as s (s.id)}
							{@const on = s.id === speciesId}
							<button
								class="option card flex flex-col items-center p-2 pb-3"
								class:on
								role="radio"
								aria-checked={on}
								onclick={() => choosePet(s.id)}
							>
								<span
									class="pet-box relative block w-full"
									data-ct
									data-species={s.id}
									data-state="happy"
									data-action={on ? 'happy' : 'idle'}
									aria-hidden="true"
								>
									<ct-kawaii class="absolute inset-0"></ct-kawaii>
								</span>
								<span class="text-[14px] font-medium">{s.label}</span>
							</button>
						{/each}
					</div>

					{#if species && breed}
						<div class="card mt-4 flex flex-col gap-1.5 p-4">
							<p class="text-[13px] text-ink-2">{breed.personality}. Eats {species.food}.</p>
							<p class="font-serif text-[22px] leading-[1.2]">“{breed.voice.gentle}”</p>
						</div>
					{/if}

					<label class="mt-6 block text-[13px] text-ink-2" for="pet-name">Its name</label>
					<input
						id="pet-name"
						class="input mt-1.5 w-full"
						placeholder={NAME_IDEAS[speciesId]}
						maxlength="40"
						bind:value={name}
						oninput={() => (nameTouched = true)}
					/>

					<div class="actions">
						<button class="btn-quiet" onclick={() => (step = 'types')}>Back</button>
						<button class="btn-ink" onclick={() => (step = 'mind')}>Next</button>
					</div>
				{:else if data && step === 'mind'}
					<h1 class="title">What's on your mind?</h1>
					<p class="lead">
						Up to {MAX_THINGS} things you keep meaning to make, learn or try. A note or a link is fine.
						{petName} will read each one and find a first small step.
					</p>

					<div class="mt-6 flex flex-col gap-2.5">
						{#each [0, 1, 2] as i (i)}
							<label class="sr-only" for="thing-{i}">Thing {i + 1}</label>
							<input
								id="thing-{i}"
								class="input w-full"
								placeholder={[
									'Learn jazz piano chords',
									'https://… a tutorial I saved',
									'Finish my portfolio'
								][i]}
								maxlength="2000"
								bind:value={things[i]}
							/>
						{/each}
					</div>
					<p class="mt-3 text-[13px] text-ink-3">
						Reading costs {ANALYSIS_COST} credits each, from your free credits for today.
						{#if filled.length}This uses {filled.length * ANALYSIS_COST}.{/if}
					</p>

					<div class="actions">
						<button class="btn-quiet" disabled={busy} onclick={() => finish(false)}>Skip</button>
						<button class="btn-ink" disabled={busy || !filled.length} onclick={() => finish(true)}>
							{busy ? 'Saving…' : `Save ${filled.length || ''} and finish`}
						</button>
					</div>
				{:else if step === 'done' && finished}
					<div class="flex flex-col items-center text-center">
						<span
							class="done-pet relative block"
							data-ct
							data-species={homeSpecies}
							data-state="happy"
							data-action="wave"
							aria-hidden="true"
						>
							<ct-kawaii class="absolute inset-0"></ct-kawaii>
						</span>
						<h1 class="title">{homeName} is home.</h1>
						{#if finished.saved.length}
							<p class="lead">
								{homeName} is reading your {finished.saved.length === 1
									? 'thing'
									: `${finished.saved.length} things`} now. Each gets a first small step.
							</p>
							<ul class="mt-5 flex w-full max-w-[420px] flex-col gap-2 text-left">
								{#each finished.saved as item (item.id)}
									<li class="card flex items-center gap-2.5 px-4 py-3 text-[14px]">
										<span class="dot" aria-hidden="true"></span>
										<a
											class="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
											href={resolve(`/things/${item.id}`)}>{item.title ?? 'Saved'}</a
										>
										<span class="text-[12px] text-ink-3">reading…</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="lead">
								Save something you want to make or learn, and it will help you start.
							</p>
						{/if}
						<div class="mt-7 flex flex-wrap justify-center gap-2.5">
							<a href={resolve('/today')} class="btn-ink">Go to today</a>
							<a href={EXTENSION_URL} target="_blank" rel="noopener" class="btn-soft desktop-only">
								Get the browser extension
							</a>
						</div>
						<p class="desktop-only mt-3 text-[13px] text-ink-3">
							The extension saves things as you browse and keeps {homeName} with you.
						</p>
					</div>
				{/if}
			</div>
		{/key}
	</main>
</div>

<style>
	.page {
		background-color: var(--color-paper);
		background-image: radial-gradient(var(--color-line) 1px, transparent 1px);
		background-size: 22px 22px;
		padding-top: env(safe-area-inset-top);
	}
	.title {
		font-family: var(--font-serif);
		font-size: clamp(36px, 7vw, 48px);
		line-height: 1.02;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.lead {
		margin-top: 12px;
		max-width: 34rem;
		font-size: 15px;
		line-height: 1.55;
		color: var(--color-ink-2);
		text-wrap: pretty;
	}
	.card {
		background: var(--color-card);
		border-radius: 16px;
		box-shadow: var(--shadow-card);
	}
	.option {
		cursor: pointer;
		transition:
			box-shadow 160ms ease,
			transform 160ms ease;
		box-shadow:
			0 0 0 1px var(--color-line),
			var(--shadow-card);
	}
	.option:hover {
		transform: translateY(-1px);
	}
	.option:active {
		transform: scale(0.98);
	}
	.option.on {
		box-shadow:
			0 0 0 2px var(--color-ink),
			var(--shadow-card);
	}
	.pet-box {
		aspect-ratio: 1;
		max-height: 140px;
	}
	.done-pet {
		width: min(220px, 60vw);
		aspect-ratio: 1;
		margin-bottom: 8px;
	}
	.input {
		height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		background: var(--color-card);
		box-shadow: 0 0 0 1px var(--color-line);
		font-size: 16px; /* 16px stops phones zooming in on focus */
		color: var(--color-ink);
		outline: none;
	}
	.input:focus-visible {
		box-shadow: 0 0 0 2px var(--color-ink);
	}
	.input::placeholder {
		color: var(--color-ink-3);
		opacity: 0.75;
	}
	.btn-ink,
	.btn-soft,
	.btn-quiet {
		display: inline-flex;
		height: 40px;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border-radius: 999px;
		padding: 0 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition:
			transform 160ms ease,
			background-color 160ms ease,
			opacity 160ms ease;
	}
	.btn-ink {
		background: var(--color-ink);
		color: var(--color-on-ink);
	}
	.btn-soft {
		background: var(--color-card);
		color: var(--color-ink);
		box-shadow: 0 0 0 1px var(--color-line);
	}
	.btn-quiet {
		padding: 0 14px;
		color: var(--color-ink-2);
	}
	.btn-quiet:hover {
		background: var(--color-paper-sunk);
		color: var(--color-ink);
	}
	.btn-ink:active,
	.btn-soft:active,
	.btn-quiet:active {
		transform: scale(0.97);
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
		transform: none;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--color-seal);
		outline-offset: 3px;
	}
	/* Next/Back: in the flow on wide screens, pinned to the bottom (thumb reach) on phones. */
	.actions {
		margin-top: 28px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	@media (max-width: 639px) {
		.actions {
			position: fixed;
			inset: auto 0 0 0;
			z-index: 10;
			margin: 0;
			padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
			background: color-mix(in oklab, var(--color-paper) 88%, transparent);
			backdrop-filter: blur(14px);
			-webkit-backdrop-filter: blur(14px);
			box-shadow: 0 -1px 0 var(--color-line);
		}
	}
	.skeleton {
		border-radius: 14px;
		background: var(--color-paper-sunk);
		animation: pulse 1.4s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.55;
		}
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-seal-soft);
		flex-shrink: 0;
	}
	.seal {
		display: flex;
		width: 28px;
		height: 28px;
		align-items: center;
		justify-content: center;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 5px;
		font-family: var(--font-serif);
		font-size: 16px;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
	}
	/* The extension is for desktop browsers. */
	@media (hover: none) and (pointer: coarse) {
		.desktop-only {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
		}
		.option,
		.btn-ink,
		.btn-soft,
		.btn-quiet {
			transition: none;
		}
	}
</style>
