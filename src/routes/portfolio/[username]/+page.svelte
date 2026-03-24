<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

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
						<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
							{#if project.finalOutput}
								<img
									src={project.finalOutput}
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
							{#if project.journal}
								<p class="mt-2 line-clamp-3 text-sm text-zinc-400">{project.journal}</p>
							{/if}
							{#if project.dateCompleted}
								<p class="mt-3 text-xs text-zinc-500">{project.dateCompleted}</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Learning Milestones -->
		{#if data.completedMilestones.length > 0}
			<section class="mb-16">
				<h2 class="mb-6 text-2xl font-semibold text-zinc-100">Learning</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					{#each data.completedMilestones as milestone (milestone.id)}
						<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
							<h3 class="mb-2 text-lg font-medium text-zinc-100">{milestone.title}</h3>
							{#if milestone.completedSkills.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each milestone.completedSkills as skill (skill)}
										<span class="rounded bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
											{skill}
										</span>
									{/each}
								</div>
							{/if}
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
