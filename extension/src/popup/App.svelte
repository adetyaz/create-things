<script lang="ts">
	import NotionConnect from './NotionConnect.svelte';
	import CaptureURL from './CaptureURL.svelte';
	import CaptureNote from './CaptureNote.svelte';
	import CaptureUpload from './CaptureUpload.svelte';
	import CaptureScreenshot from './CaptureScreenshot.svelte';
	import { checkNotionConnection, setConnected } from '../background/notion-check';

	type View = 'loading' | 'connect' | 'menu' | 'url' | 'note' | 'upload' | 'screenshot';

	let view = $state<View>('loading');

	$effect(() => {
		checkNotionConnection().then((status) => {
			setConnected(status.connected);
			view = status.connected ? 'menu' : 'connect';
		});
	});

	function goTo(target: View) {
		view = target;
	}
</script>

<div class="w-80 bg-white">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
		<div class="text-sm font-medium">
			<span class="text-gray-800">create</span>
			<span class="font-medium text-gray-900">things</span>
		</div>
		{#if view !== 'loading' && view !== 'connect'}
			<div class="h-2 w-2 rounded-full bg-teal-500" title="Connected to Notion"></div>
		{/if}
	</div>

	<!-- Content -->
	<div class="p-4">
		{#if view === 'loading'}
			<div class="flex items-center justify-center py-8">
				<div
					class="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"
				></div>
			</div>
		{:else if view === 'connect'}
			<NotionConnect />
		{:else if view === 'menu'}
			<div class="flex flex-col gap-2">
				<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Capture</p>

				<button
					onclick={() => goTo('screenshot')}
					class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50"
				>
					<span class="font-medium">Screenshot</span>
					<span class="mt-0.5 block text-xs text-gray-400">Full page or select an area</span>
				</button>

				<button
					onclick={() => goTo('url')}
					class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50"
				>
					<span class="font-medium">URL</span>
					<span class="mt-0.5 block text-xs text-gray-400">Save the current page</span>
				</button>

				<button
					onclick={() => goTo('upload')}
					class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50"
				>
					<span class="font-medium">Upload image</span>
					<span class="mt-0.5 block text-xs text-gray-400">Pick a file from your device</span>
				</button>

				<button
					onclick={() => goTo('note')}
					class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50"
				>
					<span class="font-medium">Note</span>
					<span class="mt-0.5 block text-xs text-gray-400">Capture a thought or idea</span>
				</button>
			</div>
		{:else}
			<div>
				<button
					onclick={() => goTo('menu')}
					class="mb-3 flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
				>
					&#8592; Back
				</button>

				{#if view === 'url'}
					<CaptureURL />
				{:else if view === 'note'}
					<CaptureNote />
				{:else if view === 'upload'}
					<CaptureUpload />
				{:else if view === 'screenshot'}
					<CaptureScreenshot />
				{/if}
			</div>
		{/if}
	</div>
</div>
