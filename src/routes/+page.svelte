<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

{#if !data.connected}
	<div class="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
		<div class="text-3xl font-medium">
			<span class="text-gray-600">create</span><span class="text-gray-900">things</span>
		</div>
		<p class="text-sm text-gray-500">Connect your Notion workspace to get started</p>
		<a
			href={resolve('/api/notion/authorize')}
			class="rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
		>
			Connect Notion workspace
		</a>
		<p class="max-w-xs text-xs text-gray-400">
			On the next screen, just click <strong class="font-medium text-gray-500">Allow access</strong>
			— you don't need to select any pages. We'll create everything automatically.
		</p>
	</div>
{:else}
	<div class="mx-auto max-w-6xl px-6 py-8">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-xl font-medium text-gray-800">Inspiration Vault</h1>
			</div>
			<div class="flex items-center gap-2 text-xs text-gray-400">
				<div class="h-2 w-2 rounded-full bg-teal-500"></div>
				Connected
			</div>
		</div>

		{#if data.inspirations.length === 0}
			<div class="flex flex-col items-center gap-4 py-20 text-center">
				<div class="text-4xl text-gray-200">&#9733;</div>
				<p class="text-sm text-gray-400">No inspirations saved yet</p>
				<p class="text-xs text-gray-300">Use the browser extension to capture your first piece</p>
			</div>
		{:else}
			<!-- Stale Nudges -->
			{#if data.staleItems.length > 0}
				<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
					<h2 class="mb-2 text-sm font-medium text-amber-800">
						{data.staleItems.length} inspiration{data.staleItems.length > 1 ? 's' : ''} going stale
					</h2>
					<div class="flex flex-col gap-2">
						{#each data.staleItems as stale (stale.id)}
							<div class="flex items-center justify-between rounded-lg bg-white px-3 py-2">
								<span class="text-sm text-gray-700">{stale.title}</span>
								<div class="flex gap-2">
									<a
										href={resolve('/inspiration/[id]', { id: stale.id })}
										class="rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700"
									>
										Start a project
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Vault Grid -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.inspirations as item (item.id)}
					<a
						href={resolve('/inspiration/[id]', { id: item.id })}
						class="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
					>
						{#if item.imageUrl}
							<div class="mb-3 overflow-hidden rounded-lg bg-gray-100">
								<img
									src={item.imageUrl}
									alt={item.title}
									class="h-40 w-full object-cover transition-transform group-hover:scale-105"
								/>
							</div>
						{/if}

						<div class="flex items-start justify-between gap-2">
							<h3 class="line-clamp-2 text-sm font-medium text-gray-800">{item.title}</h3>
							<span
								class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium
								{item.status === 'Ready'
									? 'bg-teal-50 text-teal-700'
									: item.status === 'Active'
										? 'bg-blue-50 text-blue-700'
										: item.status === 'Stale'
											? 'bg-amber-50 text-amber-700'
											: 'bg-gray-100 text-gray-500'}"
							>
								{item.status}
							</span>
						</div>

						<div class="mt-2 flex items-center gap-2 text-xs text-gray-400">
							<span class="capitalize">{item.captureType}</span>
							{#if item.dateSaved}
								<span>&middot;</span>
								<span>{new Date(item.dateSaved).toLocaleDateString()}</span>
							{/if}
						</div>

						{#if item.note}
							<p class="mt-2 line-clamp-2 text-xs text-gray-400">{item.note}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>
{/if}
