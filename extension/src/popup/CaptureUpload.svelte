<script lang="ts">
	import { sendCapture, getApiBase, type CapturePayload } from '../background/capture';
	import SuccessState from './SuccessState.svelte';

	let file: File | null = $state(null);
	let preview = $state('');
	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let savedPageId = $state('');
	let apiBase = $state('http://localhost:5173');
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
	<div class="flex flex-col gap-3">
		<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Upload image</p>

		{#if preview}
			<img
				src={preview}
				alt="Preview"
				class="max-h-40 w-full rounded-md border border-gray-200 object-contain"
			/>
			<button onclick={reset} class="self-end text-xs text-gray-400 underline hover:text-gray-600"
				>Remove</button
			>
		{:else}
			<label
				class="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-teal-400"
			>
				<span class="text-2xl text-gray-300">&#8593;</span>
				<span class="text-xs text-gray-400">Click to choose an image</span>
				<input type="file" accept="image/*" onchange={handleFileChange} class="hidden" />
			</label>
		{/if}

		<label
			for="capture-upload-note"
			class="text-xs font-medium tracking-wide text-gray-500 uppercase">Quick note</label
		>
		<textarea
			id="capture-upload-note"
			bind:value={note}
			class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
			rows="2"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}

		<button
			onclick={saveUpload}
			disabled={saving || !preview}
			class="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save to Notion'}
		</button>
	</div>
{/if}
