<script lang="ts">
	import { toasts, removeToast } from '$lib/toast.svelte.js';
</script>

{#if toasts.length}
	<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<div
				class="pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg
					{toast.type === 'success'
					? 'bg-teal-600 text-white'
					: toast.type === 'error'
						? 'bg-red-600 text-white'
						: 'bg-gray-800 text-white'}"
			>
				<span class="flex-1">{toast.message}</span>
				<button
					onclick={() => removeToast(toast.id)}
					class="ml-2 opacity-70 transition-opacity hover:opacity-100"
					aria-label="Dismiss"
				>
					&#x2715;
				</button>
			</div>
		{/each}
	</div>
{/if}
