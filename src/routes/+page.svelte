<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import HomeSections from '$lib/components/home/HomeSections.svelte';

	const EXTENSION_URL =
		'https://chromewebstore.google.com/detail/createthings/inemmheangfaedcdcmjgdobaopjcmeea';
	const SPECIES = ['dog', 'cat', 'rabbit', 'bird'] as const;

	type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';
	/** Same buckets as the design system's sky (section 12). */
	const timeOfDay = (h: number): TimeOfDay =>
		h >= 5 && h < 8.5
			? 'dawn'
			: h < 17.5 && h >= 8.5
				? 'day'
				: h >= 17.5 && h < 20.5
					? 'sunset'
					: 'night';
	const GREETING: Record<TimeOfDay, string> = {
		dawn: 'Good morning.',
		day: 'Good afternoon.',
		sunset: 'Good evening.',
		night: 'Still up?'
	};
	/** The ground colour the sky fades into, per time of day. */
	const FLOOR: Record<TimeOfDay, string> = {
		dawn: '#E7DCD2',
		day: '#ECE6DA',
		sunset: '#E3D2C3',
		night: '#2B2D3D'
	};

	// The visitor's clock drives the sky. Before it's known (server render), show daytime.
	let hour = $state(13);
	let species = $state<(typeof SPECIES)[number]>('dog');
	let skyReady = $state(false);
	/** Already onboarded (or signed in): the buttons open the app instead of starting over. */
	let returning = $state(false);

	const tod = $derived(timeOfDay(hour));
	const dark = $derived(tod !== 'day');

	onMount(() => {
		// Preview a time or a pet without changing the clock: /?hour=19&pet=cat
		const params = new URL(location.href).searchParams;
		const fixedHour = params.has('hour') ? Number(params.get('hour')) : NaN;
		const tick = () => {
			const d = new Date();
			hour = Number.isFinite(fixedHour)
				? ((fixedHour % 24) + 24) % 24
				: d.getHours() + d.getMinutes() / 60;
		};
		tick();
		const pet = params.get('pet');
		species = SPECIES.find((s) => s === pet) ?? SPECIES[Math.floor(Math.random() * SPECIES.length)];
		const timer = setInterval(tick, 60_000);
		fetch('/api/onboarding')
			.then((r) => (r.ok ? r.json() : null))
			.then((o) => (returning = !!o?.done))
			.catch(() => {});
		// The sky and the pet are browser-only web components (WebGL), so they load after mount.
		Promise.all([import('$lib/ct/ct-weather.js'), import('$lib/ct/ct-kawaii.js')]).then(() => {
			skyReady = true;
		});
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>createthings: a quiet room for scattered people</title>
	<meta
		name="description"
		content="Save what inspires you. Your pet helps you pick one thing, start it today and remember what you learn."
	/>
</svelte:head>

<!--
	Adaptive layout: the words sit in the space above the pet's strip of ground. Sizes follow both
	width and height, so phones, tablets, wide screens and short landscape windows all fit without
	scrolling. On phones the "Try it free" button moves from the top bar into the thumb's reach,
	and the extension button (desktop browsers only) is hidden.
-->
<main>
	<div class="hero" class:dark style:--floor={FLOOR[tod]}>
		<!-- Live sky with hills: follows the visitor's time of day. Decorative. -->
		<div
			class="sky layer"
			class:ready={skyReady}
			data-ct
			data-hour={hour}
			data-weather="clear"
			aria-hidden="true"
		>
			<ct-weather class="layer"></ct-weather>
		</div>
		<!-- A soft light behind the words by day, so they read against the blue. -->
		<div class="glow layer" aria-hidden="true"></div>
		<div class="floor" aria-hidden="true"></div>

		<header class="bar">
			<nav class="glass pill" aria-label="Main">
				<a href={resolve('/')} class="brand">
					<span class="seal" aria-hidden="true">ct</span>
					createthings
				</a>
				<a href={resolve(returning ? '/today' : '/start')} class="btn-ink btn-sm wide-only"
					>{returning ? 'Open today' : 'Try it free'}</a
				>
			</nav>
		</header>

		<section class="copy">
			<p class="meta greeting">{GREETING[tod]}</p>
			<h1 class="headline">A quiet room for <em class="accent">scattered</em> people.</h1>
			<p class="meta lead">
				Save what inspires you. Your pet helps you pick one thing, start it today and remember what
				you learn. It eats when you show up.
			</p>
			<div class="ctas">
				<a href={resolve(returning ? '/today' : '/start')} class="btn-ink btn-lg narrow-only"
					>{returning ? 'Open today' : 'Try it free'}</a
				>
				<a
					href={EXTENSION_URL}
					target="_blank"
					rel="noopener"
					class="glass btn-soft btn-lg desktop-only"
				>
					Get the browser extension
				</a>
			</div>
		</section>

		<!-- The pet wanders along the ground. Tap it for hearts. Decorative for screen readers. -->
		<div
			class="pet"
			data-ct
			data-species={species}
			data-state="happy"
			data-action={tod === 'night' ? 'sleep' : 'auto'}
			aria-hidden="true"
		>
			<ct-kawaii class="layer"></ct-kawaii>
		</div>

		<!-- A hint that there is more below the sky. -->
		<a href="#how" class="meta more">How it works <span aria-hidden="true">↓</span></a>
	</div>

	<HomeSections extensionUrl={EXTENSION_URL} {species} {returning} />
</main>

<style>
	/* Colours over the sky follow the design system (section 12): ink on white glass by day,
	   paper text on dark glass at dawn, sunset and night. */
	.hero {
		--sky-ink: #1b1a17;
		--sky-meta: #57534b;
		--glass-bg: rgba(255, 255, 255, 0.5);
		--glass-ring: inset 0 0 0 1px rgba(255, 255, 255, 0.65);
		--btn-bg: #1b1a17;
		--btn-ink: #ffffff;
		--accent: oklch(0.5 0.15 35);
		/* Sizes that adapt to the window. */
		--pet-h: clamp(140px, 27svh, 300px);
		--gutter: max(16px, env(safe-area-inset-left), env(safe-area-inset-right));

		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100svh;
		overflow: hidden;
		color: var(--sky-ink);
		background: linear-gradient(180deg, #33669e 0%, #6f9fd3 45%, var(--floor) 100%);
	}
	.hero.dark {
		--sky-ink: #f6f4ef;
		--sky-meta: #d9d4ca;
		--glass-bg: rgba(22, 24, 38, 0.42);
		--glass-ring: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
		--btn-bg: #f6f4ef;
		--btn-ink: #1b1a17;
		--accent: oklch(0.8 0.1 45);
		background: linear-gradient(180deg, #0b1023 0%, #282a4a 55%, var(--floor) 100%);
	}

	/* Background layers. */
	.layer {
		position: absolute;
		inset: 0;
	}
	.sky,
	.glow,
	.floor {
		z-index: -1;
		pointer-events: none;
	}
	.sky {
		opacity: 0;
		transition: opacity 900ms ease;
	}
	.sky.ready {
		opacity: 1;
	}
	.glow {
		background: radial-gradient(
			ellipse 55% 40% at 50% 38%,
			rgba(246, 244, 239, 0.62),
			rgba(246, 244, 239, 0.22) 55%,
			transparent 75%
		);
	}
	.dark .glow {
		background: radial-gradient(
			ellipse 55% 40% at 50% 38%,
			rgba(11, 16, 35, 0.35),
			transparent 75%
		);
	}
	.floor {
		position: absolute;
		inset: auto 0 0 0;
		height: calc(var(--pet-h) + 8svh);
		background: linear-gradient(180deg, transparent 0%, var(--floor) 75%);
	}

	/* Top bar. */
	.bar {
		display: flex;
		justify-content: center;
		padding: calc(16px + env(safe-area-inset-top)) var(--gutter) 0;
	}
	.pill {
		display: flex;
		height: 48px;
		align-items: center;
		gap: 12px;
		border-radius: 999px;
		padding: 0 6px 0 10px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-right: 6px;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.glass {
		background: var(--glass-bg);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow:
			var(--glass-ring),
			0 8px 24px rgba(27, 26, 23, 0.12);
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
		font-weight: 400;
		color: oklch(0.5 0.15 35);
		background: rgba(255, 255, 255, 0.7);
		transform: rotate(-4deg);
	}

	/* The words: centred in the space above the pet's ground. */
	.copy {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: clamp(24px, 6svh, 72px) var(--gutter) calc(var(--pet-h) * 0.85);
		text-align: center;
	}
	.greeting {
		font-size: 13px;
	}
	.headline {
		margin-top: clamp(8px, 2svh, 18px);
		max-width: 14ch;
		font-family: var(--font-serif);
		font-weight: 400;
		/* Grows with the width, but never taller than the window allows. */
		font-size: clamp(42px, min(8.4vw, 11svh), 112px);
		line-height: 0.98;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.accent {
		color: var(--accent);
	}
	.lead {
		margin-top: clamp(12px, 2.4svh, 22px);
		max-width: 34rem;
		font-size: clamp(15px, 1.1vw + 10px, 18px);
		line-height: 1.55;
		text-wrap: pretty;
	}
	.meta {
		color: var(--sky-meta);
	}
	.ctas {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: clamp(18px, 4svh, 36px);
	}
	.ctas:empty {
		display: none;
	}

	/* Buttons: one ink button per view (design system section 04). */
	.btn-ink,
	.btn-soft {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 500;
		white-space: nowrap;
		transition:
			transform 160ms ease,
			background-color 160ms ease;
	}
	.btn-sm {
		height: 36px;
		padding: 0 16px;
		font-size: 13px;
	}
	.btn-lg {
		height: 44px;
		padding: 0 22px;
		font-size: 15px;
	}
	.btn-ink {
		background: var(--btn-bg);
		color: var(--btn-ink);
	}
	.btn-soft {
		color: var(--sky-ink);
	}
	.btn-ink:hover,
	.btn-soft:hover {
		transform: translateY(-1px);
	}
	.btn-ink:active,
	.btn-soft:active {
		transform: scale(0.97);
	}
	a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	/* The pet's strip of ground: as wide as the screen, so it can wander. */
	.pet {
		position: absolute;
		inset: auto 0 calc(2svh + env(safe-area-inset-bottom)) 0;
		height: var(--pet-h);
		z-index: 0;
	}
	.more {
		position: relative;
		z-index: 1;
		justify-self: center;
		margin-bottom: calc(10px + env(safe-area-inset-bottom));
		border-radius: 999px;
		padding: 6px 12px;
		font-size: 12px;
	}
	.more:hover {
		color: var(--sky-ink);
	}
	.bar,
	.copy {
		position: relative;
		z-index: 1;
	}

	/* Phones: the main button sits under the words, in thumb reach; the bar is just the name. */
	.narrow-only {
		display: none;
	}
	@media (max-width: 639px) {
		.wide-only {
			display: none;
		}
		.narrow-only {
			display: inline-flex;
		}
		.pill {
			padding: 0 14px 0 10px;
		}
		.glow {
			background: radial-gradient(
				ellipse 95% 38% at 50% 40%,
				rgba(246, 244, 239, 0.66),
				rgba(246, 244, 239, 0.24) 60%,
				transparent 80%
			);
		}
	}
	/* The extension only works in desktop browsers. */
	@media (hover: none) and (pointer: coarse) {
		.desktop-only {
			display: none;
		}
	}
	/* Short windows (phones on their side, small laptops): less ground, tighter words. */
	@media (max-height: 560px) {
		.hero {
			--pet-h: clamp(96px, 30svh, 150px);
		}
		.greeting {
			display: none;
		}
		.headline {
			font-size: clamp(34px, min(7vw, 13svh), 72px);
		}
		.lead {
			max-width: 44rem;
			font-size: 14px;
		}
	}
	/* Big screens: room to breathe. */
	@media (min-width: 1600px) and (min-height: 900px) {
		.lead {
			max-width: 38rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sky,
		.btn-ink,
		.btn-soft {
			transition: none;
		}
	}
</style>
