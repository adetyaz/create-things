<script lang="ts">
	let { onReset }: { onReset: () => void } = $props();
</script>

<div class="flex flex-col items-center gap-3 p-4 text-center">
	<div class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
		<span class="text-xl text-teal-600">&#10003;</span>
	</div>
	<p class="text-sm font-medium text-gray-800">Saved to Notion</p>
	<p class="text-xs text-gray-400">Your inspiration is being analyzed by AI</p>
	<button
		onclick={onReset}
		class="mt-2 text-xs text-teal-600 underline transition-colors hover:text-teal-700"
	>
		Capture something else
	</button>
</div>
