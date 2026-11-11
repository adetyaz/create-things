<script lang="ts">
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { shell, refreshShell, ROOM, PET_STATE, timeOfDay, FLOOR } from '$lib/shell.svelte';
	import RoomStrip from '$lib/components/shell/RoomStrip.svelte';
	import StoryboardMenu from '$lib/components/shell/StoryboardMenu.svelte';

	/**
	 * Every app screen: the constant (sky and pet) on top, the storyboard menu one tap away.
	 * Today is the room itself (design 11/12), so it shows the full room instead of the strip.
	 */
	let { children } = $props();

	const isToday = $derived(page.url.pathname.endsWith('/today'));

	// The constant: the live sky for the time of day, and the pet's state on the page (09, 13).
	let hour = $state(13);
	const tod = $derived(timeOfDay(hour));
	const petState = $derived(shell.pet ? (PET_STATE[shell.pet.mood] ?? 'happy') : 'egg');
	const room = $derived(ROOM[petState] ?? ROOM.happy);

	onMount(() => {
		// A clicked button that disables itself is working: mark it busy until it's enabled again.
		const onClick = (e: MouseEvent) => {
			const b = (e.target as HTMLElement | null)?.closest('button');
			if (!b) return;
			requestAnimationFrame(() => {
				if (!b.disabled) return;
				b.setAttribute('aria-busy', 'true');
				const watch = new MutationObserver(() => {
					if (b.disabled) return;
					b.removeAttribute('aria-busy');
					watch.disconnect();
				});
				watch.observe(b, { attributes: true, attributeFilter: ['disabled'] });
			});
		};
		document.addEventListener('click', onClick, true);
		const now = () => {
			const d = new Date();
			hour = d.getHours() + d.getMinutes() / 60;
		};
		now();
		const clock = setInterval(now, 60_000);
		// Not onboarded yet: onboarding first. Signed out (when sign-in is on): sign in, then back here.
		api<{ done: boolean }>('/api/onboarding').then(
			(o) => {
				if (!o.done) goto(resolve('/start'));
			},
			(e) => {
				if (e instanceof ApiError && e.needsSignIn)
					window.location.assign(
						`${resolve('/signin')}?next=${encodeURIComponent(page.url.pathname + page.url.search)}`
					);
			}
		);
		void refreshShell();
		void Promise.all([
			import('$lib/ct/ct-weather.js'),
			import('$lib/ct/ct-kawaii.js'),
			import('$lib/ct/ct-grime.js')
		]);
		return () => {
			clearInterval(clock);
			document.removeEventListener('click', onClick, true);
		};
	});

	// Going to another place closes the menu.
	$effect(() => {
		void page.url.href;
		shell.menu = false;
	});
</script>

{#if navigating.to}<div class="nav-bar" role="progressbar" aria-label="Loading"></div>{/if}
<div class="app" style:--strip-h={isToday ? '0px' : '112px'} style:--dust={room.dust}>
	{#if !isToday}
		<div class="sky" aria-hidden="true">
			<div class="fill" data-ct data-hour={hour} data-weather="clear">
				<ct-weather class="fill"></ct-weather>
			</div>
			<div
				class="floor"
				style:background="linear-gradient(180deg,rgba(0,0,0,0) 0%,{FLOOR[tod]} 80%)"
			></div>
			<div
				class="fill"
				data-ct
				data-level={room.dust}
				data-webs={room.webs}
				data-fog="0"
				data-tone={tod === 'day' ? 'light' : 'dark'}
				data-seed="22"
			>
				<ct-grime class="fill"></ct-grime>
			</div>
		</div>
		<RoomStrip menuOpen={shell.menu} onmenu={() => (shell.menu = !shell.menu)} />
	{/if}
	<div class="page">
		{@render children()}
	</div>
	{#if shell.menu}
		<StoryboardMenu onclose={() => (shell.menu = false)} />
	{/if}
</div>

<style>
	/* Moving between pages: a thin bar along the top until the next page is ready. */
	.nav-bar {
		position: fixed;
		z-index: 100;
		top: 0;
		left: 0;
		height: 3px;
		width: 100%;
		background: #1b1a17;
		transform-origin: left;
		animation: grow 1.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
	}
	@keyframes grow {
		from {
			transform: scaleX(0.05);
		}
		to {
			transform: scaleX(0.85);
		}
	}
	.app {
		position: relative;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		background: #b9c8d8;
	}
	/* The sky stays put behind the pages while they scroll. Never takes taps. */
	.sky {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.floor {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: 40%;
	}
	.page {
		position: relative;
		z-index: 1;
		flex: 1;
	}
	/* Design 13: as the pet goes hungry, paper surfaces get a darker, dusty edge.
	   Text and buttons keep full contrast. Pages use it with: box-shadow: var(--dusty-edge). */
	.app {
		--dusty-edge: inset 0 0 calc(10px + var(--dust, 0) * 50px)
			rgba(120, 104, 80, calc(var(--dust, 0) * 0.28));
	}
</style>
