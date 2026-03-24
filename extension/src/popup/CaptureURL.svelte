<script lang="ts">
	import { sendCapture, getCurrentTab, type CapturePayload } from '../background/capture';

	let currentUrl = $state('');
	let currentTitle = $state('');
	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	$effect(() => {
		getCurrentTab().then((tab) => {
			currentUrl = tab.url;
			currentTitle = tab.title;
		});
	});

	async function saveUrl() {
		if (!currentUrl) return;
		saving = true;
		error = '';

		const payload: CapturePayload = {
			type: 'url',
			title: currentTitle,
			sourceUrl: currentUrl,
			note: note || undefined
		};

		const result = await sendCapture(payload);
		saving = false;

		if (result.success) {
			saved = true;
		} else {
			error = result.error || 'Failed to save';
		}
	}
</script>

{#if saved}
	<div class="flex flex-col items-center gap-3 p-4 text-center">
		<div class="text-2xl">&#10003;</div>
		<p class="text-sm font-medium text-teal-600">Saved to Notion</p>
		<button
			onclick={() => {
				saved = false;
				note = '';
			}}
			class="text-xs text-gray-400 underline hover:text-gray-600"
		>
			Save another
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		<label for="capture-url" class="text-xs font-medium tracking-wide text-gray-500 uppercase"
			>URL</label
		>
		<input
			id="capture-url"
			type="url"
			bind:value={currentUrl}
			class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
			placeholder="Page URL"
		/>

		<label for="capture-url-note" class="text-xs font-medium tracking-wide text-gray-500 uppercase"
			>Quick note</label
		>
		<textarea
			id="capture-url-note"
			bind:value={note}
			class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
			rows="2"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}

		<button
			onclick={saveUrl}
			disabled={saving || !currentUrl}
			class="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save to Notion'}
		</button>
	</div>
{/if}
