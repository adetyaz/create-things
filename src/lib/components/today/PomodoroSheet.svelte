<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';

	/**
	 * Design system 14, Pomodoro: the Ring face (the default). Focus uses ink. During a session the
	 * interface goes calm. Ending a session asks "What did you do?" (the 04 check-in input) and
	 * feeds the pet: POST /api/pomodoro/[id]/end { note } (the note goes into the journal).
	 */

	let {
		stepId,
		stepTitle,
		pet,
		onclose,
		onfed,
		onerror
	}: {
		stepId: string | null;
		stepTitle: string | null;
		pet: { name: string; species: string } | null;
		onclose: () => void;
		onfed: () => void;
		onerror: (e: unknown) => void;
	} = $props();

	type Session = { id: string; startedAt: string };

	let session = $state<Session | null>(null);
	let minutes = $state(25);
	let now = $state(Date.now());
	let pausedAt = $state<number | null>(null);
	let pausedFor = $state(0);
	let phase = $state<'focus' | 'note' | 'fed'>('focus');
	let note = $state('');
	let saving = $state(false);
	let fedText = $state('');

	const elapsed = $derived(
		session
			? Math.max(0, ((pausedAt ?? now) - new Date(session.startedAt).getTime() - pausedFor) / 1000)
			: 0
	);
	const total = $derived(minutes * 60);
	const left = $derived(Math.max(0, total - elapsed));
	const time = $derived(
		`${String(Math.floor(left / 60)).padStart(2, '0')}:${String(Math.floor(left % 60)).padStart(2, '0')}`
	);
	const deg = $derived(Math.min(360, (elapsed / total) * 360));

	onMount(() => {
		(async () => {
			try {
				const open = await api<{ session: Session | null }>('/api/pomodoro');
				if (open.session) {
					session = open.session;
				} else {
					const res = await api<{ session: Session; minutes: number }>('/api/pomodoro', 'POST', {
						stepId: stepId ?? undefined
					});
					session = res.session;
					minutes = res.minutes ?? 25;
				}
			} catch (e) {
				onerror(e);
				onclose();
			}
		})();
		const t = setInterval(() => {
			now = Date.now();
			if (phase === 'focus' && session && left <= 0) phase = 'note';
		}, 250);
		return () => clearInterval(t);
	});

	function toggle() {
		if (pausedAt) {
			pausedFor += Date.now() - pausedAt;
			pausedAt = null;
		} else pausedAt = Date.now();
	}

	async function end() {
		if (!session || saving) return;
		saving = true;
		try {
			const res = await api<{ fed?: { food?: string } | null; minutes?: number }>(
				`/api/pomodoro/${session.id}/end`,
				'POST',
				{ note: note.trim() || undefined }
			);
			if (res.fed) {
				fedText = `${pet?.name ?? 'Your pet'} ate. ${Math.round(elapsed / 60)} minutes counted.`;
				phase = 'fed';
				onfed();
				setTimeout(onclose, 2200);
			} else onclose();
		} catch (e) {
			onerror(e);
		} finally {
			saving = false;
		}
	}
</script>

<div class="calm" transition:fade={{ duration: 240 }}>
	<div class="column" in:rise={{ y: 12, duration: 240 }}>
		<!-- 14: Ring -->
		<div class="face">
			<div
				class="ring"
				style:background="conic-gradient(#1B1A17 0 {deg}deg,#EFECE5 {deg}deg 360deg)"
			>
				<div class="ring-inner">
					<div class="time">{time}</div>
					<div class="label">
						{phase === 'focus' ? (pausedAt ? 'Paused' : 'Focus') : 'Done'}
					</div>
				</div>
			</div>
			{#if stepTitle}<div class="step">{stepTitle}</div>{/if}
		</div>

		{#if phase === 'focus'}
			<div class="controls">
				<button class="btn-ink" onclick={toggle}>{pausedAt ? 'Resume' : 'Pause'}</button>
				<button class="btn-quiet" onclick={() => (phase = 'note')}>End</button>
			</div>
		{:else if phase === 'note'}
			<!-- 04: the check-in input -->
			<div class="checkin" in:rise={{ y: 8, duration: 220 }}>
				<div class="ask">What did you do? <span class="opt">optional</span></div>
				<div class="field">
					<input
						bind:value={note}
						placeholder="did 5 minutes on the chords"
						maxlength="2000"
						onkeydown={(e) => e.key === 'Enter' && end()}
					/>
					<button class="btn-small" disabled={saving} onclick={end}>Check in</button>
				</div>
			</div>
		{:else}
			<div class="fed" in:rise={{ y: 8, duration: 220 }}>
				{#if pet}
					<span
						class="pet"
						data-ct
						data-species={pet.species}
						data-state="happy"
						data-action="eat"
						aria-hidden="true"><ct-kawaii class="fill"></ct-kawaii></span
					>
				{/if}
				<div class="fed-text">{fedText}</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* "During a session the interface goes calm." */
	.calm {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: rgba(246, 244, 239, 0.94);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.column {
		width: min(360px, 100%);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.face {
		position: relative;
		height: 300px;
		padding: 28px;
		box-sizing: border-box;
		border-radius: 20px;
		background: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.ring {
		position: relative;
		width: 184px;
		height: 184px;
		border-radius: 50%;
	}
	.ring-inner {
		position: absolute;
		inset: 8px;
		border-radius: 50%;
		background: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.time {
		font-family: 'Instrument Serif', serif;
		font-size: 48px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.label,
	.step {
		font-size: 11px;
		color: #5f5a52;
	}
	.controls {
		display: flex;
		justify-content: center;
		gap: 10px;
	}
	.btn-ink {
		height: 38px;
		padding: 0 18px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
		font-weight: 500;
	}
	.btn-quiet {
		height: 38px;
		padding: 0 14px;
		border-radius: 999px;
		color: #57534b;
		font-size: 14px;
		font-weight: 500;
	}
	.btn-ink,
	.btn-quiet,
	.btn-small {
		transition: transform var(--dur-press) var(--ease-out);
	}
	.btn-ink:active,
	.btn-quiet:active,
	.btn-small:active {
		transform: scale(0.96);
	}
	.checkin {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ask {
		font-size: 12px;
		color: #5f5a52;
	}
	.opt {
		color: #6b665e;
	}
	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 44px;
		padding: 0 6px 0 16px;
		background: #efece5;
		border-radius: 14px;
	}
	.field:focus-within {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.field input {
		flex: 1;
		min-width: 0;
		background: transparent;
		outline: none;
		font-size: 14px;
		color: #1b1a17;
	}
	.field input::placeholder {
		color: #5f5a52;
	}
	.btn-small {
		height: 28px;
		padding: 0 12px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 12px;
		font-weight: 500;
	}
	button:disabled {
		opacity: 0.5;
	}
	.fed {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.pet {
		position: relative;
		width: 160px;
		height: 160px;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.fed-text {
		font-family: 'Instrument Serif', serif;
		font-size: 24px;
		text-align: center;
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		.btn-ink:active,
		.btn-quiet:active,
		.btn-small:active {
			transform: none;
		}
	}
</style>
