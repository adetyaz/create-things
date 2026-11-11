<script lang="ts">
	import { onMount } from 'svelte';
	import { shell, ROOM, PET_STATE, timeOfDay, glassFor } from '$lib/shell.svelte';
	import PetActions from './PetActions.svelte';
	import CheckIn from './CheckIn.svelte';

	/**
	 * The constant: the extension popup's room strip (design 11) across the top of every app
	 * screen. Live sky for the time of day, dust by mood, the pet (tap → its actions, 07), the
	 * brand pill (tap → the storyboard menu), the mood card with Check in, and credits (08).
	 */
	let { menuOpen, onmenu }: { menuOpen: boolean; onmenu: () => void } = $props();

	let hour = $state(new Date().getHours() + new Date().getMinutes() / 60);
	let actions = $state(false);
	let checking = $state(false);

	const tod = $derived(timeOfDay(hour));
	const glass = $derived(glassFor(tod));
	const p = $derived(shell.pet);
	const petState = $derived(p ? (PET_STATE[p.mood] ?? 'happy') : 'egg');
	const room = $derived(ROOM[petState] ?? ROOM.happy);
	const c = $derived(shell.credits);
	const freePct = $derived(c ? Math.round((c.freeLeftToday / Math.max(1, c.freeDaily)) * 100) : 0);

	onMount(() => {
		const t = setInterval(() => {
			const d = new Date();
			hour = d.getHours() + d.getMinutes() / 60;
		}, 60_000);
		return () => clearInterval(t);
	});
</script>

<header class="strip">
	<button
		class="pet"
		aria-label={p
			? `${room.short(p.pet.name)}. Open what you can do with ${p.pet.name}`
			: 'Meet your pet'}
		aria-expanded={actions}
		onclick={() => (actions = !actions)}
	>
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

	<div class="inner">
		<div class="top-row">
			<button
				class="brand"
				class:open={menuOpen}
				aria-expanded={menuOpen}
				aria-controls="storyboard"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				style:color={glass.ink}
				onclick={onmenu}
			>
				<span class="seal">ct</span>createthings
			</button>

			{#if c}
				<div
					class="credits"
					style:background={glass.bg}
					style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
					style:color={glass.ink}
					title="Free AI left today. Saving, sorting and planning are always free."
				>
					<span
						class="ring"
						style:background="conic-gradient(currentColor 0 {freePct}%,rgba(128,128,128,.35) {freePct}%
						100%)"
					></span>
					{c.freeLeftToday} free{c.freeLeftToday === 0 ? ` · ${c.balance} credits` : ''}
				</div>
			{/if}
		</div>

		{#if p}
			<div
				class="mood"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
			>
				<div class="mood-head" style:color={glass.ink}>
					<span class="dot" style:background={room.dot}></span>{room.short(p.pet.name)}
				</div>
				<div class="mood-long" style:color={glass.meta}>{p.why}</div>
				<button class="btn-xs" onclick={() => (checking = !checking)}>Check in</button>
			</div>
		{/if}
	</div>
</header>

{#if checking}
	<div class="catch" role="presentation" onclick={() => (checking = false)}></div>
	<div class="checkin-pop">
		<CheckIn autofocus ondone={() => (checking = false)} />
	</div>
{/if}

{#if actions}
	<PetActions onclose={() => (actions = false)} />
{/if}

<style>
	/* Design 11 popup room strip, full width. Content bleeds; controls stay in the margins. */
	.strip {
		position: relative;
		z-index: 2;
		height: var(--strip-h, 112px);
		overflow: hidden;
		flex: none;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.pet {
		position: absolute;
		inset-inline-start: max(4px, env(safe-area-inset-left));
		bottom: -14px;
		width: 120px;
		height: 120px;
		z-index: 1;
		cursor: pointer;
	}
	.inner {
		position: absolute;
		inset: 0;
		padding: 10px max(10px, env(safe-area-inset-right)) 10px max(132px, env(safe-area-inset-left));
		z-index: 2;
		pointer-events: none;
	}
	.inner > * {
		pointer-events: auto;
	}
	.top-row {
		position: absolute;
		top: 10px;
		inset-inline-start: max(10px, env(safe-area-inset-left));
		display: flex;
		gap: 6px;
		pointer-events: auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px 0 6px;
		border-radius: 999px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		font-size: 12px;
		font-weight: 600;
		transition: transform var(--dur-press) var(--ease-out);
	}
	.brand:active {
		transform: scale(0.96);
	}
	.brand.open {
		box-shadow:
			0 0 0 2px #1b1a17,
			0 8px 24px rgba(27, 26, 23, 0.12) !important;
	}
	.seal {
		width: 18px;
		height: 18px;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 11px;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
	}
	.credits {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px 0 8px;
		border-radius: 999px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		font-size: 12px;
	}
	.ring {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	.mood {
		position: absolute;
		bottom: 10px;
		inset-inline-end: max(10px, env(safe-area-inset-right));
		width: min(260px, calc(100% - 150px));
		padding: 10px 12px;
		border-radius: 14px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		display: flex;
		align-items: center;
		gap: 8px 10px;
		flex-wrap: wrap;
	}
	.mood-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.mood-long {
		flex-basis: 100%;
		font-size: 11px;
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.btn-xs {
		height: 24px;
		padding: 0 10px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 11px;
		font-weight: 500;
		transition: transform var(--dur-press) var(--ease-out);
	}
	.btn-xs:active {
		transform: scale(0.96);
	}
	.catch {
		position: fixed;
		inset: 0;
		z-index: 49;
	}
	.checkin-pop {
		position: fixed;
		z-index: 50;
		top: calc(var(--strip-h, 112px) + 8px);
		inset-inline-end: 16px;
		width: min(360px, calc(100% - 32px));
		padding: 12px;
		background: #fff;
		border-radius: 20px;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.12);
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	/* Narrow: the mood card keeps its line short so it never covers the pet. */
	@media (max-width: 520px) {
		.mood {
			width: calc(100% - 150px);
		}
		.mood-long {
			display: none;
		}
	}
</style>
