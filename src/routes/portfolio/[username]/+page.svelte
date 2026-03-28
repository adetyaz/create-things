<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let expandedProject = $state<string | null>(null);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const activeProject = $derived(data.projects.find((p: any) => p.id === expandedProject) ?? null);

	function youtubeEmbed(url: string): string | null {
		const m =
			url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) || null;
		return m ? `https://www.youtube.com/embed/${m[1]}` : null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') expandedProject = null;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>{data.profile.username}'s Portfolio — createthings</title>
</svelte:head>

{#if !data.found}
	<div class="mx-auto max-w-2xl px-6 py-20 text-center">
		<h1 class="mb-4 text-3xl font-bold text-zinc-100">Portfolio Not Available</h1>
		<p class="text-zinc-400">This portfolio hasn't been set up yet, or it may be private.</p>
	</div>
{:else}
	<div class="mx-auto max-w-5xl px-6 py-12">
		<!-- Header -->
		<header class="mb-12 text-center">
			<h1 class="mb-2 text-4xl font-bold text-zinc-100">{data.profile.username}</h1>
			{#if data.profile.bio}
				<p class="mx-auto max-w-xl text-lg text-zinc-400">{data.profile.bio}</p>
			{/if}
			{#if data.profile.creativeDna}
				<div
					class="mt-4 inline-block rounded-full bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300"
				>
					{data.profile.creativeDna}
				</div>
			{/if}
		</header>

		<!-- Published Work -->
		{#if data.projects.length > 0}
			<section class="mb-16">
				<h2 class="mb-6 text-2xl font-semibold text-zinc-100">Work</h2>
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.projects as project (project.id)}
						<button
							type="button"
							class="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-violet-500/60 {expandedProject ===
							project.id
								? 'border-violet-500/60'
								: ''}"
							onclick={() => (expandedProject = project.id)}
						>
							{#if project.coverImage}
								<img
									src={project.coverImage}
									alt={project.title}
									class="mb-4 aspect-video w-full rounded-lg object-cover"
								/>
							{/if}
							<h3 class="mb-1 text-lg font-medium text-zinc-100">{project.title}</h3>
							{#if project.remixTag}
								<span
									class="mb-2 inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
								>
									{project.remixTag}
								</span>
							{/if}
							{#if project.dateCompleted}
								<p class="mt-3 text-xs text-zinc-500">{project.dateCompleted}</p>
							{/if}
							<p
								class="mt-3 text-xs text-violet-400 opacity-0 transition-opacity group-hover:opacity-100"
							>
								View details →
							</p>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Project detail modal -->
		{#if activeProject}
			<!-- Backdrop -->
			<button
				type="button"
				class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
				aria-label="Close"
				onclick={() => (expandedProject = null)}
			></button>

			<!-- Panel -->
			<div
				class="fixed inset-x-4 top-16 bottom-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl sm:inset-x-auto sm:top-12 sm:bottom-12 sm:left-1/2 sm:w-full sm:-translate-x-1/2 sm:rounded-2xl"
			>
				<div class="mb-5 flex items-start justify-between gap-4">
					<div>
						<h2 class="text-2xl font-semibold text-zinc-100">{activeProject.title}</h2>
						{#if activeProject.remixTag}
							<span
								class="mt-1 inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
							>
								{activeProject.remixTag}
							</span>
						{/if}
						{#if activeProject.dateCompleted}
							<p class="mt-1 text-xs text-zinc-500">{activeProject.dateCompleted}</p>
						{/if}
					</div>
					<button
						type="button"
						class="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
						aria-label="Close"
						onclick={() => (expandedProject = null)}
					>
						✕
					</button>
				</div>

				{#if activeProject.blocks?.length}
					<div class="space-y-3">
						{#each activeProject.blocks as block, bi (bi)}
							{#if block.type === 'heading_2'}
								<h2 class="text-lg font-semibold text-zinc-100">{block.content}</h2>
							{:else if block.type === 'heading_3'}
								<h3 class="text-base font-medium text-zinc-200">{block.content}</h3>
							{:else if block.type === 'bulleted_list_item'}
								<p class="pl-4 text-sm text-zinc-400">&bull;&nbsp;{block.content}</p>
							{:else if block.type === 'image' && block.content}
								<img src={block.content} alt="" class="max-h-96 w-full rounded-lg object-contain" />
							{:else if block.type === 'video' && block.content}
								{#if youtubeEmbed(block.content)}
									<iframe
										src={youtubeEmbed(block.content)}
										title="Video"
										class="aspect-video w-full rounded-lg"
										frameborder="0"
										allowfullscreen
									></iframe>
								{:else}
									<a
										href={block.content}
										target="_blank"
										rel="external noopener noreferrer"
										class="text-sm text-violet-400 underline">{block.content}</a
									>
								{/if}
							{:else if block.type === 'divider'}
								<hr class="border-zinc-800" />
							{:else if block.content}
								<p class="text-sm leading-relaxed text-zinc-400">{block.content}</p>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="text-sm text-zinc-500">No additional content for this project.</p>
				{/if}
			</div>
		{/if}

		<!-- Learning Milestones -->
		{#if data.completedMilestones.length > 0}
			<section class="mb-16">
				<h2 class="mb-6 text-2xl font-semibold text-zinc-100">Learning</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each data.completedMilestones as milestone (milestone.id)}
						<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
							<h3 class="mb-2 text-lg font-medium text-zinc-100">{milestone.title}</h3>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Inspiration Sources -->
		{#if data.inspirations.length > 0}
			<section class="mb-16">
				<h2 class="mb-6 text-2xl font-semibold text-zinc-100">Inspiration</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.inspirations as insp (insp.id)}
						<div class="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
							{#if insp.imageUrl}
								<img
									src={insp.imageUrl}
									alt={insp.title}
									class="aspect-square w-full object-cover transition-transform group-hover:scale-105"
								/>
							{:else}
								<div
									class="flex aspect-square items-center justify-center bg-zinc-800 text-zinc-600"
								>
									No image
								</div>
							{/if}
							<div class="p-3">
								<p class="truncate text-sm text-zinc-300">{insp.title}</p>
								{#if insp.captureType}
									<p class="text-xs text-zinc-500">{insp.captureType}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Empty state -->
		{#if !data.projects.length && !data.completedMilestones.length && !data.inspirations.length}
			<div class="py-20 text-center">
				<p class="text-lg text-zinc-400">This portfolio is empty for now.</p>
			</div>
		{/if}

		<footer class="mt-12 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
			Built with <span class="text-violet-400">createthings</span>
		</footer>
	</div>
{/if}
