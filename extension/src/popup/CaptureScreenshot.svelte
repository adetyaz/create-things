<script lang="ts">
	import { sendCapture, type CapturePayload } from '../background/capture';

	let preview = $state('');
	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');
	let capturing = $state(false);

	async function captureFullPage() {
		capturing = true;
		error = '';

		try {
			const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
			if (response.success) {
				preview = response.dataUrl;
			} else {
				error = response.error || 'Failed to capture';
			}
		} catch (err) {
			error = String(err);
		}

		capturing = false;
	}

	async function captureArea() {
		capturing = true;
		error = '';

		try {
			// Send message to content script to start area selection
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) {
				error = 'No active tab';
				capturing = false;
				return;
			}

			chrome.tabs.sendMessage(tab.id, { type: 'START_AREA_SELECT' });
			// Close popup — content script will handle the rest and send to background
			window.close();
		} catch (err) {
			error = String(err);
			capturing = false;
		}
	}

	async function saveScreenshot() {
		if (!preview) return;
		saving = true;
		error = '';

		const payload: CapturePayload = {
			type: 'screenshot',
			title: `Screenshot — ${new Date().toLocaleString()}`,
			imageBase64: preview,
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

	function reset() {
		preview = '';
		note = '';
		saved = false;
		error = '';
	}
</script>

{#if saved}
	<div class="flex flex-col items-center gap-3 p-4 text-center">
		<div class="text-2xl">&#10003;</div>
		<p class="text-sm font-medium text-teal-600">Saved to Notion</p>
		<button onclick={reset} class="text-xs text-gray-400 underline hover:text-gray-600">
			Capture another
		</button>
	</div>
{:else if preview}
	<div class="flex flex-col gap-3">
		<img
			src={preview}
			alt="Screenshot preview"
			class="max-h-40 w-full rounded-md border border-gray-200 object-contain"
		/>

		<label
			for="capture-screenshot-note"
			class="text-xs font-medium tracking-wide text-gray-500 uppercase">Quick note</label
		>
		<textarea
			id="capture-screenshot-note"
			bind:value={note}
			class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
			rows="2"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}

		<div class="flex gap-2">
			<button
				onclick={reset}
				class="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
			>
				Retake
			</button>
			<button
				onclick={saveScreenshot}
				disabled={saving}
				class="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Save to Notion'}
			</button>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Screenshot</p>

		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}

		<button
			onclick={captureFullPage}
			disabled={capturing}
			class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
		>
			<span class="font-medium">Full page</span>
			<span class="mt-0.5 block text-xs text-gray-400">Capture the entire visible page</span>
		</button>

		<button
			onclick={captureArea}
			disabled={capturing}
			class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
		>
			<span class="font-medium">Select area</span>
			<span class="mt-0.5 block text-xs text-gray-400">Draw a box to capture a portion</span>
		</button>
	</div>
{/if}
