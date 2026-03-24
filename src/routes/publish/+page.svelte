<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-8">
	<!-- Back nav -->
	<a
		href={resolve('/')}
		class="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
	>
		&#8592; Back to Vault
	</a>

	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-xl font-medium text-gray-900">Publish Queue</h1>
		<p class="mt-1 text-sm text-gray-400">Review and approve captions before publishing</p>
	</div>

	{#if data.entries.length === 0}
		<div class="flex flex-col items-center gap-4 py-20 text-center">
			<div class="text-4xl text-gray-200">&#9993;</div>
			<p class="text-sm text-gray-400">No publish queue entries yet</p>
			<p class="text-xs text-gray-300">Prepare a project for publishing to see captions here</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each data.entries as entry (entry.id)}
				<div class="rounded-xl border border-gray-200 bg-white p-6">
					<!-- Entry header -->
					<div class="mb-4 flex items-start justify-between gap-4">
						<div>
							<h2 class="text-lg font-medium text-gray-900">{entry.title}</h2>
							{#if entry.platforms.length}
								<div class="mt-1 flex flex-wrap gap-1.5">
									{#each entry.platforms as platform (platform)}
										<span
											class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
										>
											{platform}
										</span>
									{/each}
								</div>
							{/if}
						</div>
						<span
							class="shrink-0 rounded-full px-3 py-1 text-xs font-medium
							{entry.status === 'Published'
								? 'bg-teal-50 text-teal-700'
								: entry.status === 'Approved'
									? 'bg-blue-50 text-blue-700'
									: 'bg-gray-100 text-gray-500'}"
						>
							{entry.status}
						</span>
					</div>

					<!-- Captions -->
					<div class="space-y-3">
						{#if entry.captionTwitter}
							<div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
								<p class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
									Twitter / X
								</p>
								<p class="text-sm text-gray-700">{entry.captionTwitter}</p>
							</div>
						{/if}

						{#if entry.captionLinkedIn}
							<div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
								<p class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
									LinkedIn
								</p>
								<p class="text-sm text-gray-700">{entry.captionLinkedIn}</p>
							</div>
						{/if}

						{#if entry.captionInstagram}
							<div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
								<p class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
									Instagram
								</p>
								<p class="text-sm text-gray-700">{entry.captionInstagram}</p>
							</div>
						{/if}

						{#if entry.captionReddit}
							<div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
								<p class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">Reddit</p>
								<p class="text-sm text-gray-700">{entry.captionReddit}</p>
							</div>
						{/if}
					</div>

					<!-- Credit & hashtags -->
					{#if entry.creditLine || entry.hashtags}
						<div class="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
							{#if entry.creditLine}
								<span>Credit: {entry.creditLine}</span>
							{/if}
							{#if entry.hashtags}
								<span>{entry.hashtags}</span>
							{/if}
						</div>
					{/if}

					<!-- Published timestamp -->
					{#if entry.publishedAt}
						<p class="mt-3 text-xs text-gray-300">
							Published {new Date(entry.publishedAt).toLocaleString()}
						</p>
					{/if}

					<!-- Actions -->
					{#if entry.status === 'Draft'}
						<div class="mt-4 flex gap-3">
							<form method="POST" action="?/approve" use:enhance>
								<input type="hidden" name="entryId" value={entry.id} />
								<button
									type="submit"
									class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
								>
									Approve &amp; Queue
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
