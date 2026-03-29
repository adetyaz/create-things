<script lang="ts">
	import { sendCapture, getApiBase, type CapturePayload } from '../background/capture';
	import SuccessState from './SuccessState.svelte';

	let file: File | null = $state(null);
	let preview = $state('');
	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let savedPageId = $state('');
	let apiBase = $state('https://create-things.vercel.app');
	let error = $state('');

	$effect(() => {
		getApiBase().then((b) => (apiBase = b));
	});

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const selected = input.files?.[0];
		if (!selected) return;

		file = selected;
		const reader = new FileReader();
		reader.onload = () => {
			preview = reader.result as string;
		};
		reader.readAsDataURL(selected);
	}

	async function saveUpload() {
		if (!preview) return;
		saving = true;
		error = '';

		const payload: CapturePayload = {
			type: 'upload',
			title: file?.name || 'Uploaded image',
			imageBase64: preview,
			note: note || undefined
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

	function reset() {
		file = null;
		preview = '';
		note = '';
		saved = false;
		savedPageId = '';
		error = '';
	}
</script>

{#if saved}
	<SuccessState pageId={savedPageId} {apiBase} onReset={reset} />
{:else}
	<div class="flex flex-col gap-0 p-4">
		<p class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow uppercase">
			QUICK_CAPTURE_V1
		</p>

		{#if preview}
			<div class="relative mb-4 border-2 border-white/20">
				<img src={preview} alt="Preview" class="max-h-36 w-full object-contain" />
				<button
					onclick={reset}
					class="absolute top-1 right-1 border border-white/20 bg-zine-black/80 px-2 py-1 font-display text-[9px] font-bold tracking-widest text-white/50 uppercase transition-colors hover:text-white"
					>REMOVE</button
				>
			</div>
		{:else}
			<label
				class="mb-4 flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed border-white/30 p-8 transition-colors hover:border-zine-yellow/50"
			>
				<span class="font-display text-2xl font-bold text-white/40">↑</span>
				<span class="font-display text-[9px] font-bold tracking-widest text-white/50 uppercase"
					>DROP IMAGE / CLICK TO SELECT</span
				>
				<input type="file" accept="image/*" onchange={handleFileChange} class="hidden" />
			</label>
		{/if}

		<label
			for="capture-upload-note"
			class="mb-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase"
			>OBSERVATIONS</label
		>
		<textarea
			id="capture-upload-note"
			bind:value={note}
			class="mb-6 w-full resize-none border-b-2 border-white/20 bg-transparent pb-2 font-body text-sm text-white/90 placeholder-white/50 transition-colors outline-none focus:border-zine-yellow/50"
			rows="2"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="mb-3 font-display text-[9px] tracking-widest text-red-400 uppercase">{error}</p>
		{/if}

		<button
			onclick={saveUpload}
			disabled={saving || !preview}
			class="w-full border-2 border-zine-yellow bg-zine-yellow py-3.5 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
		>
			{saving ? 'UPLOADING...' : '→ SEND TO VAULT'}
		</button>
	</div>
{/if}
