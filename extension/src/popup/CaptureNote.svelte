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
	<div class="flex flex-col gap-3">
		<label for="capture-note" class="text-xs font-medium tracking-wide text-gray-500 uppercase"
			>Note</label
		>
		<textarea
			id="capture-note"
			bind:value={note}
			class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
			rows="5"
			placeholder="Ideas, concepts, thoughts, verbal inspiration..."
		></textarea>

		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}

		<button
			onclick={saveNote}
			disabled={saving || !note.trim()}
			class="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save to Notion'}
		</button>
	</div>
{/if}
