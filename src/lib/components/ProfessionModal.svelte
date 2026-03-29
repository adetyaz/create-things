<script lang="ts">
	import { onMount } from 'svelte';

	const STORAGE_KEY = 'ct_creator_profile';

	const PROFESSIONS = [
		'Designer',
		'Developer',
		'Photographer',
		'Filmmaker',
		'Illustrator',
		'Writer',
		'Other'
	];

	let visible = $state(false);
	let selected = $state('');
	let detail = $state('');

	onMount(() => {
		const existing = localStorage.getItem(STORAGE_KEY);
		if (!existing) visible = true;
	});

	function save() {
		if (!selected) return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ profession: selected, detail: detail.trim() })
		);
		visible = false;
	}

	function skip() {
		// Mark as seen so the modal doesn't reappear
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ profession: '', detail: '' }));
		visible = false;
	}
</script>

{#if visible}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zine-black/70 px-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="profession-modal-title"
	>
		<div class="w-full max-w-sm border-2 border-zine-black bg-zine-off-white">
			<!-- Header -->
			<div class="border-b-2 border-zine-black px-6 py-5">
				<p
					class="mb-1 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					FIRST_USE
				</p>
				<h2
					id="profession-modal-title"
					class="font-display text-xl font-bold text-zine-black uppercase"
				>
					How do you create?
				</h2>
				<p class="mt-1.5 font-body text-xs text-zine-black/50">
					This shapes your analysis and roadmaps
				</p>
			</div>

			<!-- Profession options -->
			<div class="grid grid-cols-2 gap-2 px-6 pt-5 pb-4">
				{#each PROFESSIONS as p (p)}
					<button
						type="button"
						onclick={() => (selected = p)}
						class="border-2 px-3 py-3 font-display text-[10px] font-bold tracking-widest uppercase transition-all duration-75
							{selected === p
							? 'border-zine-black bg-zine-yellow text-zine-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
							: 'border-zine-black/20 text-zine-black/50 hover:border-zine-black hover:text-zine-black'}"
					>
						{p}
					</button>
				{/each}
			</div>

			<!-- Detail field -->
			{#if selected}
				<div class="px-6 pb-4">
					<input
						type="text"
						bind:value={detail}
						placeholder={selected === 'Other'
							? 'e.g. motion designer, ceramicist'
							: `e.g. street ${selected.toLowerCase()}, portrait ${selected.toLowerCase()}`}
						class="w-full border-2 border-zine-black/20 bg-white px-4 py-2.5 font-body text-sm text-zine-black transition-colors placeholder:text-zine-black/25 focus:border-zine-black focus:outline-none"
					/>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center justify-between border-t-2 border-zine-black/10 px-6 py-4">
				<button
					type="button"
					onclick={skip}
					class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase transition-colors hover:text-zine-black/60"
				>
					SKIP
				</button>
				<button
					type="button"
					onclick={save}
					disabled={!selected}
					class="border-2 border-zine-yellow bg-zine-yellow px-5 py-2.5 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
				>
					→ SAVE
				</button>
			</div>
		</div>
	</div>
{/if}
