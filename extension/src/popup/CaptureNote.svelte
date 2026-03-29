<script lang="ts">
	import { sendCapture, getApiBase, type CapturePayload } from '../background/capture';
	import SuccessState from './SuccessState.svelte';

	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let savedPageId = $state('');
	let apiBase = $state('http://localhost:5173');
	let error = $state('');

	$effect(() => {
		getApiBase().then((b) => (apiBase = b));
	});

	async function saveNote() {
		if (!note.trim()) return;
		saving = true;
		error = '';

		const payload: CapturePayload = {
			type: 'note',
			note: note.trim()
		};

		const result = await sendCapture(payload);
		saving = false;

		if (result.success) {
			savedPageId = result.pageId || '';
			saved = true;
		} else {
			error = result.error || 'Failed to save';
		}
	}
</script>

{#if saved}
	<SuccessState
		pageId={savedPageId}
		{apiBase}
		onReset={() => {
			saved = false;
			note = '';
		}}
	/>
{:else}
	<div class="flex flex-col gap-0 p-4">
		<p class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow uppercase">
			QUICK_CAPTURE_V1
		</p>

		<label
			for="capture-note"
			class="mb-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase"
			>OBSERVATIONS</label
		>
		<textarea
			id="capture-note"
			bind:value={note}
			class="mb-6 w-full resize-none border-b-2 border-white/20 bg-transparent pb-2 font-body text-sm text-white/90 placeholder-white/50 transition-colors outline-none focus:border-zine-yellow/50"
			rows="8"
			placeholder="Ideas, concepts, thoughts, verbal inspiration..."
		></textarea>

		<div class="mb-6 flex items-center justify-between">
			<span class="font-display text-[8px] tracking-widest text-white/50 uppercase"
				>{note.length} CHARS</span
			>
		</div>

		{#if error}
			<p class="mb-3 font-display text-[9px] tracking-widest text-red-400 uppercase">{error}</p>
		{/if}

		<button
			onclick={saveNote}
			disabled={saving || !note.trim()}
			class="w-full border-2 border-zine-yellow bg-zine-yellow py-3.5 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
		>
			{saving ? 'CAPTURING...' : '→ DISPATCH NOTE'}
		</button>
	</div>
{/if}
