<script lang="ts">
	import { sendCapture, getApiBase, type CapturePayload } from '../background/capture';
	import SuccessState from './SuccessState.svelte';

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
	<div class="flex flex-col gap-0 p-4">
		<p class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow uppercase">
			QUICK_CAPTURE_V1
		</p>

		<div class="mb-4 border-2 border-white/20">
			<img src={preview} alt="Screenshot preview" class="max-h-36 w-full object-contain" />
		</div>

		<label
			for="capture-screenshot-note"
			class="mb-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase"
			>OBSERVATIONS</label
		>
		<textarea
			id="capture-screenshot-note"
			bind:value={note}
			class="mb-6 w-full resize-none border-b-2 border-white/20 bg-transparent pb-2 font-body text-sm text-white/90 placeholder-white/50 transition-colors outline-none focus:border-zine-yellow/50"
			rows="2"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="mb-3 font-display text-[9px] tracking-widest text-red-400 uppercase">{error}</p>
		{/if}

		<div class="flex gap-2">
			<button
				onclick={reset}
				class="flex-1 border-2 border-white/30 py-3 font-display text-[10px] font-bold tracking-widest text-white/60 uppercase transition-colors hover:border-white/50 hover:text-white/90"
			>
				RETAKE
			</button>
			<button
				onclick={saveScreenshot}
				disabled={saving}
				class="flex-1 border-2 border-zine-yellow bg-zine-yellow py-3 font-display text-[10px] font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-30"
			>
				{saving ? 'SAVING...' : '→ CAPTURE'}
			</button>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-0 p-4">
		<p class="mb-6 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow uppercase">
			CAPTURE_VIEW
		</p>

		{#if error}
			<p class="mb-4 font-display text-[9px] tracking-widest text-red-400 uppercase">{error}</p>
		{/if}

		<div class="flex flex-col gap-3">
			<button
				onclick={captureFullPage}
				disabled={capturing}
				class="w-full border-2 border-white/20 px-4 py-4 text-left transition-colors hover:border-zine-yellow/50 hover:bg-white/5 disabled:opacity-30"
			>
				<p class="font-display text-[10px] font-bold tracking-widest text-white/80 uppercase">
					FULL PAGE
				</p>
				<p class="mt-1 font-display text-[8px] tracking-wider text-white/30 uppercase">
					Capture entire visible area
				</p>
			</button>

			<button
				onclick={captureArea}
				disabled={capturing}
				class="w-full border-2 border-white/20 px-4 py-4 text-left transition-colors hover:border-zine-yellow/50 hover:bg-white/5 disabled:opacity-30"
			>
				<p class="font-display text-[10px] font-bold tracking-widest text-white/80 uppercase">
					SELECT AREA
				</p>
				<p class="mt-1 font-display text-[8px] tracking-wider text-white/30 uppercase">
					Draw a box to capture a portion
				</p>
			</button>
		</div>
	</div>
{/if}
