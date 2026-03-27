<script lang="ts">
	let {
		onReset,
		pageId = '',
		apiBase = 'http://localhost:5173'
	}: { onReset: () => void; pageId?: string; apiBase?: string } = $props();

	function viewInDashboard() {
		const url = pageId ? `${apiBase}/inspiration/${pageId}` : `${apiBase}/`;
		chrome.tabs.create({ url });
		window.close();
	}
</script>

<div class="flex flex-col items-center gap-3 p-4 text-center">
	<div class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
		<span class="text-xl text-teal-600">&#10003;</span>
	</div>
	<p class="text-sm font-medium text-gray-800">Saved to Notion</p>
	<p class="text-xs text-gray-400">Your inspiration is being analyzed by AI</p>
	<button
		onclick={viewInDashboard}
		class="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
	>
		View
	</button>
	<button
		onclick={onReset}
		class="text-xs text-gray-400 underline transition-colors hover:text-gray-600"
	>
		Capture something else
	</button>
</div>
