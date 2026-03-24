<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data } = $props();
	let journal = $derived(data.project.journal);
	let saving = $state(false);
	let saved = $state(false);
</script>

<div class="mx-auto max-w-3xl px-6 py-8">
	<!-- Back nav -->
	<a
		href={resolve('/')}
		class="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
	>
		&#8592; Back to Vault
	</a>

	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between gap-4">
			<h1 class="text-2xl font-medium text-gray-900">{data.project.title}</h1>
			<span
				class="shrink-0 rounded-full px-3 py-1 text-xs font-medium
				{data.project.status === 'Done'
					? 'bg-teal-50 text-teal-700'
					: data.project.status === 'In Progress'
						? 'bg-blue-50 text-blue-700'
						: 'bg-gray-100 text-gray-500'}"
			>
				{data.project.status}
			</span>
		</div>

		<div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
			{#if data.project.remixTag}
				<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
					>{data.project.remixTag}</span
				>
			{/if}
			{#if data.project.dateStarted}
				<span>Started {new Date(data.project.dateStarted).toLocaleDateString()}</span>
			{/if}
			{#if data.project.dateCompleted}
				<span>&middot; Completed {new Date(data.project.dateCompleted).toLocaleDateString()}</span>
			{/if}
			{#if data.project.isPublic}
				<span class="text-teal-600">Public</span>
			{/if}
		</div>
	</div>

	<!-- Linked inspirations -->
	{#if data.inspirations.length}
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Inspirations</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.inspirations as insp (insp.id)}
					<a
						href={resolve('/inspiration/[id]', { id: insp.id })}
						class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-teal-300 hover:text-teal-700"
					>
						{insp.title}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Creative journal -->
	<section>
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Creative Journal</h2>
		<form
			method="POST"
			action="?/saveJournal"
			use:enhance={() => {
				saving = true;
				saved = false;
				return async ({ update }) => {
					await update();
					saving = false;
					saved = true;
					setTimeout(() => {
						saved = false;
					}, 2000);
				};
			}}
		>
			<textarea
				name="journal"
				bind:value={journal}
				class="w-full resize-none rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 focus:border-teal-500 focus:outline-none"
				rows="12"
				placeholder="Write about your creative process, decisions, thoughts..."
			></textarea>

			<div class="mt-3 flex items-center gap-3">
				<button
					type="submit"
					disabled={saving}
					class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Journal'}
				</button>
				{#if saved}
					<span class="text-xs text-teal-600">Saved &#10003;</span>
				{/if}
			</div>
		</form>
	</section>
</div>
