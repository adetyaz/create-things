<script lang="ts">
	import { sendCapture, getApiBase, type CapturePayload } from '../background/capture';
	import SuccessState from './SuccessState.svelte';

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
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) {
				error = 'No active tab';
				capturing = false;
				return;
			}

			// Ensure the content script is present (may not be on pre-existing tabs)
			try {
				await chrome.scripting.executeScript({
					target: { tabId: tab.id },
					files: ['screenshot.js']
				});
			} catch {
				// Already injected — ignore the error
			}

			chrome.tabs.sendMessage(tab.id, { type: 'START_AREA_SELECT' });
			// Close popup — content script handles the rest
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
			savedPageId = result.pageId || '';
			saved = true;
		} else {
			error = result.error || 'Failed to save';
		}
	}

	function reset() {
		preview = '';
		note = '';
		saved = false;
		savedPageId = '';
		error = '';
	}
</script>

{#if saved}
	<SuccessState pageId={savedPageId} {apiBase} onReset={reset} />
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
