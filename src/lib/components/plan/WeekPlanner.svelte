<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';

	/**
	 * Plan the week (Cal Newport's time blocking + James Clear's implementation intentions and
	 * habit stacking): pick when you can work, the pet fills each block with the next step, taking
	 * turns between your goals so each one moves, then save. Free: no AI.
	 * POST /api/plan/week (fill), PUT /api/plan/week (save).
	 */
	let { onsaved, onerror }: { onsaved: () => void; onerror: (e: unknown) => void } = $props();

	type Step = {
		id: string;
		title: string;
		minutes: number;
		itemId: string;
		itemTitle: string;
		milestone?: string;
	};
	type Filled = {
		day: string;
		startTime?: string | null;
		anchor?: string | null;
		place?: string | null;
		step: Step | null;
		intention: string | null;
		beforeClass?: { date: string; unit: string };
	};
	type Proposal = {
		blocks: Filled[];
		classes: { date: string; unit: string; itemTitle: string }[];
		needsRoadmap: { id: string; title: string }[];
		clashes: (unknown | null)[];
	};

	const iso = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(Date.now() + i * 86_400_000);
		return {
			day: iso(d),
			label: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
			weekend: d.getDay() === 0 || d.getDay() === 6
		};
	});
	const WHEN = [
		{ id: '08:00', label: 'Morning · 08:00', time: '08:00' },
		{ id: '12:30', label: 'Lunch · 12:30', time: '12:30' },
		{ id: '19:00', label: 'Evening · 19:00', time: '19:00' },
		{ id: 'coffee', label: 'After coffee', anchor: 'after coffee' },
		{ id: 'work', label: 'After work', anchor: 'after work' }
	] as const;

	let chosenDays = $state<string[]>(days.filter((d) => !d.weekend).map((d) => d.day));
	let when = $state<(typeof WHEN)[number]['id']>('08:00');
	let twice = $state(false);
	let place = $state('my desk');
	let proposal = $state<Proposal | null>(null);
	let busy = $state(false);
	let saved = $state(false);

	const slot = $derived(WHEN.find((w) => w.id === when)!);
	const byDay = $derived(
		proposal
			? days
					.map((d) => ({
						...d,
						blocks: proposal!.blocks
							.map((b, i) => ({ ...b, clash: proposal!.clashes[i] ?? null }))
							.filter((b) => b.day === d.day)
					}))
					.filter((d) => d.blocks.length)
			: []
	);
	const filledCount = $derived(proposal?.blocks.filter((b) => b.step).length ?? 0);

	function toggleDay(day: string) {
		chosenDays = chosenDays.includes(day)
			? chosenDays.filter((d) => d !== day)
			: [...chosenDays, day];
	}

	async function fill() {
		busy = true;
		saved = false;
		try {
			const base = 'time' in slot ? { startTime: slot.time } : { anchor: slot.anchor };
			const second =
				'time' in slot && slot.time === '19:00' ? { startTime: '08:00' } : { startTime: '19:00' };
			const blocks = chosenDays
				.sort()
				.flatMap((day) => [
					{ day, ...base, place: place.trim() || null },
					...(twice ? [{ day, ...second, place: place.trim() || null }] : [])
				]);
			proposal = await api<Proposal>('/api/plan/week', 'POST', { blocks });
		} catch (e) {
			onerror(e);
		} finally {
			busy = false;
		}
	}

	async function save() {
		if (!proposal) return;
		busy = true;
		try {
			await api('/api/plan/week', 'PUT', {
				blocks: proposal.blocks
					.filter((b) => b.step)
					.map((b) => ({
						day: b.day,
						startTime: b.startTime ?? null,
						anchor: b.anchor ?? null,
						place: b.place ?? null,
						stepId: b.step!.id
					}))
			});
			saved = true;
			onsaved();
		} catch (e) {
			onerror(e);
		} finally {
			busy = false;
		}
	}
</script>

<section class="week">
	<div class="ask">
		<p class="q">Which days can you work on your things?</p>
		<div class="chips">
			{#each days as d (d.day)}
				<button
					class="chip"
					class:on={chosenDays.includes(d.day)}
					aria-pressed={chosenDays.includes(d.day)}
					onclick={() => toggleDay(d.day)}>{d.label}</button
				>
			{/each}
		</div>
	</div>
	<div class="ask">
		<p class="q">When?</p>
		<div class="chips">
			{#each WHEN as w (w.id)}
				<button
					class="chip"
					class:on={when === w.id}
					aria-pressed={when === w.id}
					onclick={() => (when = w.id)}>{w.label}</button
				>
			{/each}
			<button class="chip" class:on={twice} aria-pressed={twice} onclick={() => (twice = !twice)}
				>+ a second block each day</button
			>
		</div>
	</div>
	<div class="ask">
		<label class="q" for="place">Where?</label>
		<input id="place" class="field" bind:value={place} maxlength="60" placeholder="my desk" />
	</div>
	<button class="btn-ink" disabled={busy || !chosenDays.length} onclick={fill}>
		{busy && !proposal ? 'Filling…' : proposal ? 'Fill again' : 'Fill my week'} · free
	</button>

	{#if proposal}
		<div class="result" in:rise={{ y: 8, duration: 240 }}>
			{#if proposal.needsRoadmap.length}
				<div class="note">
					<p class="strong">Start these first, so they can fill blocks:</p>
					<p class="muted">
						{#each proposal.needsRoadmap as n, i (n.id)}{i ? ' · ' : ''}<a
								class="link"
								href={resolve(`/things/${n.id}`)}>{n.title}</a
							>{/each}
					</p>
				</div>
			{/if}
			{#if proposal.classes.length}
				<div class="note">
					<p class="strong">Classes this week</p>
					{#each proposal.classes as c (c.date + c.unit)}<p class="muted">
							{c.date} · {c.unit} ({c.itemTitle})
						</p>{/each}
				</div>
			{/if}

			<p class="muted">
				{filledCount} of {proposal.blocks.length} blocks filled, taking turns between your goals so each
				one moves.
			</p>
			{#each byDay as d (d.day)}
				<div class="day">
					<p class="day-label">{d.label}</p>
					{#each d.blocks as b, i (b.day + i)}
						{#if b.step}
							<div class="block">
								<p class="intention">{b.intention}</p>
								<p class="meta">
									{b.step.itemTitle}{b.step.milestone ? ` · ${b.step.milestone}` : ''} · {b.step
										.minutes} min
									{#if b.beforeClass}· before your {b.beforeClass.unit} class{/if}
								</p>
								{#if b.clash}<p class="clash">
										Busy in your calendar at this time. Pick another time or move it after saving.
									</p>{/if}
							</div>
						{:else}
							<div class="empty block">
								<p class="meta">Free block: nothing left to plan here.</p>
							</div>
						{/if}
					{/each}
				</div>
			{/each}
			{#if saved}
				<p class="saved">
					Your week is planned. Today's blocks are on Today; the rest show up each day.
				</p>
				<a class="btn-white" href={resolve('/today')}>Go to today</a>
			{:else}
				<button class="btn-ink" disabled={busy || !filledCount} onclick={save}>Save the week</button
				>
			{/if}
		</div>
	{/if}
</section>

<style>
	.week {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.ask {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.q {
		font-size: 12px;
		color: #5f5a52;
	}
	.chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.chip {
		height: 34px;
		padding: 0 14px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 13px;
		font-weight: 500;
		transition-property: scale, background-color, color;
		transition-duration: 150ms;
	}
	.chip.on {
		background: #1b1a17;
		color: #fff;
		box-shadow: none;
	}
	.chip:active {
		scale: 0.96;
	}
	.field {
		height: 42px;
		padding: 0 14px;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 14px;
		outline: none;
		max-width: 320px;
	}
	.field:focus-visible {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.result {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.note {
		padding: 12px 14px;
		border-radius: 14px;
		background: #efece5;
	}
	.strong {
		font-size: 13px;
		font-weight: 600;
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.link {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.day {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.day-label {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.block {
		background: #fff;
		border-radius: 16px;
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.block.empty {
		background: transparent;
		box-shadow: inset 0 0 0 1px #e4e0d7;
	}
	.intention {
		font-size: 15px;
		line-height: 1.4;
	}
	.meta {
		font-size: 12px;
		color: #5f5a52;
	}
	.clash {
		font-size: 12px;
		color: oklch(0.5 0.15 35);
	}
	.saved {
		font-size: 13px;
		color: oklch(0.4 0.1 145);
	}
	.btn-ink,
	.btn-white {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 20px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		background: #1b1a17;
		color: #fff;
	}
	.btn-white {
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.btn-ink:active,
	.btn-white:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.45;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
</style>
