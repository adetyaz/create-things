<script lang="ts">
	import {
		sendCapture,
		getCurrentTab,
		getApiBase,
		type CapturePayload
	} from '../background/capture';
	import SuccessState from './SuccessState.svelte';

	let currentUrl = $state('');
	let currentTitle = $state('');
	let note = $state('');
	let saving = $state(false);
	let saved = $state(false);
	let savedPageId = $state('');
	let apiBase = $state('http://localhost:5173');
	let error = $state('');

	$effect(() => {
		getApiBase().then((b) => (apiBase = b));
	});

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

		<div class="mb-4 border-2 border-white/10 p-3">
			<div class="flex items-start gap-2">
				<span class="mt-px shrink-0 font-display text-[9px] text-white/30 uppercase">[ ]</span>
				<input
					id="capture-url"
					type="url"
					bind:value={currentUrl}
					class="flex-1 bg-transparent font-body text-xs text-white/70 placeholder-white/20 outline-none"
					placeholder="https://..."
				/>
			</div>
		</div>

		<label
			for="capture-url"
			class="mb-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase"
			>CAPTURE_ORIGIN</label
		>
		<input
			type="text"
			bind:value={currentTitle}
			class="mb-4 w-full border-b-2 border-white/10 bg-transparent pb-2 font-body text-sm text-white/80 placeholder-white/20 transition-colors outline-none focus:border-zine-yellow/50"
			placeholder="Page title"
		/>

		<label
			for="capture-url-note"
			class="mb-1 font-display text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase"
			>OBSERVATIONS</label
		>
		<textarea
			id="capture-url-note"
			bind:value={note}
			class="mb-6 w-full resize-none border-b-2 border-white/10 bg-transparent pb-2 font-body text-sm text-white/80 placeholder-white/20 transition-colors outline-none focus:border-zine-yellow/50"
			rows="3"
			placeholder="What caught your eye?"
		></textarea>

		{#if error}
			<p class="mb-3 font-display text-[9px] tracking-widest text-red-400 uppercase">{error}</p>
		{/if}

		<button
			onclick={saveUrl}
			disabled={saving || !currentUrl}
			class="w-full border-2 border-zine-yellow bg-zine-yellow py-3.5 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
		>
			{saving ? 'CAPTURING...' : '→ CAPTURE'}
		</button>
	</div>
{/if}
