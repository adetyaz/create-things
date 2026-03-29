<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
	let startingProject = $state(false);
	let projectError = $state('');

	function parseMilestones(raw: string): string[] {
		if (!raw) return [];
		const byLine = raw
			.split('\n')
			.map((s: string) => s.trim())
			.filter(Boolean);
		if (byLine.length > 1) {
			return byLine.map((line: string) => line.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
		}
		const parts = raw.split(/,\s*(?=\d+[.)])/);
		if (parts.length > 1) {
			return parts.map((s: string) => s.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
		}
		return [raw];
	}

	const milestoneList = $derived(parseMilestones(data.roadmap.milestones));

	async function startProject() {
		startingProject = true;
		projectError = '';
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inspirationId: data.inspirationId })
			});
			if (!res.ok) {
				const body = await res.json();
				projectError = body.error || 'Failed to create project';
				return;
			}
			const result = await res.json();
			window.location.href = `/projects/${result.projectId}`;
		} catch (err) {
			projectError = String(err);
		} finally {
			startingProject = false;
		}
	}
</script>

<div class="min-h-screen bg-zine-off-white px-6 py-8">
	<div class="mx-auto max-w-3xl">
		<!-- Back nav -->
		<div
			class="mb-8 flex items-center gap-2 font-display text-[9px] font-bold tracking-[0.25em] uppercase"
		>
			<a href={resolve('/')} class="text-zine-black/40 transition-colors hover:text-zine-black"
				>&#8592; Vault</a
			>
			{#if data.inspirationId}
				<span class="text-zine-black/20">/</span>
				<a
					href={resolve('/inspiration/[id]', { id: data.inspirationId })}
					class="text-zine-black/40 transition-colors hover:text-zine-black"
				>
					{data.inspirationTitle}
				</a>
			{/if}
		</div>

		<!-- Header -->
		<div class="mb-10 border-b-2 border-zine-black pb-8">
			<p
				class="mb-2 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				LEARNING_ROADMAP
			</p>
			<h1 class="font-display text-3xl leading-tight font-bold text-zine-black uppercase">
				{data.roadmap.title}
			</h1>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<span
					class="border-2 px-3 py-1.5 font-display text-[9px] font-bold tracking-widest uppercase
					{data.roadmap.progress === 'Complete'
						? 'border-zine-green bg-zine-green text-zine-black'
						: data.roadmap.progress === 'In progress'
							? 'border-zine-yellow bg-zine-yellow text-zine-black'
							: 'border-zine-black/15 bg-transparent text-zine-black/40'}"
				>
					{data.roadmap.progress}
				</span>
				{#if milestoneList.length}
					<span
						class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase"
					>
						{milestoneList.length} STEP{milestoneList.length !== 1 ? 'S' : ''}
					</span>
				{/if}
			</div>
		</div>

		<!-- Skills -->
		{#if data.roadmap.skills}
			<section class="mb-10">
				<p
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					SKILLS_TO_DEVELOP
				</p>
				<div class="flex flex-wrap gap-2">
					{#each data.roadmap.skills
						.split(',')
						.map((s: string) => s.trim())
						.filter(Boolean) as skill (skill)}
						<span
							class="bg-zine-black px-3 py-1.5 font-display text-[8px] font-bold tracking-widest text-zine-off-white uppercase"
						>
							{skill}
						</span>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Milestones -->
		{#if milestoneList.length}
			<section class="mb-10">
				<p
					class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					LEARNING_MILESTONES
				</p>
				<div class="flex flex-col gap-3">
					{#each milestoneList as milestone, i (i)}
						<div
							class="flex border-2 border-zine-black/10 bg-white transition-colors hover:border-zine-black/20"
						>
							<!-- Step number -->
							<div
								class="flex w-14 shrink-0 items-center justify-center border-r-2 border-zine-black/10 bg-zine-off-white"
							>
								<span class="font-display text-lg font-bold text-zine-black/25"
									>{String(i + 1).padStart(2, '0')}</span
								>
							</div>
							<!-- Task -->
							<div class="flex flex-1 items-center p-4">
								<p class="font-body text-sm leading-relaxed text-zine-black/80">{milestone}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{:else if data.roadmap.milestones}
			<section class="mb-10">
				<p
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					LEARNING_MILESTONES
				</p>
				<div class="border-2 border-zine-black/10 bg-white p-5">
					<div class="font-body text-sm leading-relaxed whitespace-pre-line text-zine-black/70">
						{data.roadmap.milestones}
					</div>
				</div>
			</section>
		{/if}

		<!-- Resources -->
		{#if data.roadmap.resources}
			<section class="mb-10">
				<p
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					RESOURCES
				</p>
				<div class="border-2 border-zine-black/10 bg-white p-5">
					<div class="font-body text-sm leading-relaxed whitespace-pre-line text-zine-black/70">
						{data.roadmap.resources}
					</div>
				</div>
			</section>
		{/if}

		<!-- Start Project CTA -->
		{#if data.inspirationId}
			<div class="border-t-2 border-zine-black/10 pt-8">
				<p
					class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					READY_TO_BUILD?
				</p>
				<button
					onclick={startProject}
					disabled={startingProject}
					class="border-2 border-zine-black bg-zine-yellow px-8 py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#0D0D0D] transition-all duration-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{startingProject ? 'CREATING...' : '→ START PROJECT'}
				</button>
				{#if projectError}
					<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
						{projectError}
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
