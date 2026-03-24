<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl px-6 py-8">
	<!-- Back nav -->
	<div class="mb-6 flex items-center gap-3 text-xs text-gray-400">
		<a href={resolve('/')} class="transition-colors hover:text-gray-600">&#8592; Vault</a>
		{#if data.inspirationId}
			<span>&middot;</span>
			<a
				href={resolve('/inspiration/[id]', { id: data.inspirationId })}
				class="transition-colors hover:text-gray-600"
			>
				{data.inspirationTitle}
			</a>
		{/if}
	</div>

	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-medium text-gray-900">{data.roadmap.title}</h1>
		<div class="mt-2 flex items-center gap-3">
			<span
				class="rounded-full px-3 py-1 text-xs font-medium
				{data.roadmap.progress === 'Complete'
					? 'bg-teal-50 text-teal-700'
					: data.roadmap.progress === 'In progress'
						? 'bg-blue-50 text-blue-700'
						: 'bg-gray-100 text-gray-500'}"
			>
				{data.roadmap.progress}
			</span>
			{#if data.roadmap.completedSkills.length}
				<span class="text-xs text-gray-400">
					{data.roadmap.completedSkills.length} skills completed
				</span>
			{/if}
		</div>
	</div>

	<!-- Skills -->
	{#if data.roadmap.skills}
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
				Skills to Develop
			</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.roadmap.skills
					.split(',')
					.map((s: string) => s.trim())
					.filter(Boolean) as skill (skill)}
					<span
						class="rounded-full px-3 py-1.5 text-sm font-medium
						{data.roadmap.completedSkills.includes(skill)
							? 'bg-teal-100 text-teal-800 line-through'
							: 'bg-gray-100 text-gray-700'}"
					>
						{skill}
					</span>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Milestones -->
	{#if data.roadmap.milestones}
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
				Learning Milestones
			</h2>
			<div class="rounded-lg border border-gray-200 bg-white p-5">
				<div class="text-sm leading-relaxed whitespace-pre-line text-gray-700">
					{data.roadmap.milestones}
				</div>
			</div>
		</section>
	{/if}

	<!-- Resources -->
	{#if data.roadmap.resources}
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Resources</h2>
			<div class="rounded-lg border border-gray-200 bg-white p-5">
				<div class="text-sm leading-relaxed whitespace-pre-line text-gray-700">
					{data.roadmap.resources}
				</div>
			</div>
		</section>
	{/if}
</div>
