<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let expandedProject = $state<string | null>(null);
	const profileType = $derived(
		((data.profile as Record<string, unknown>).profileType as string | undefined) ?? 'generic'
	);

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
	<div class="flex min-h-screen items-center justify-center bg-zine-black px-6">
		<div class="text-center">
			<p
				class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/40 uppercase"
			>
				PORTFOLIO_NOT_FOUND
			</p>
			<h1 class="mb-3 font-display text-3xl font-bold text-white uppercase">Not Available</h1>
			<p class="font-body text-sm text-white/40">
				This portfolio hasn't been set up yet, or it may be private.
			</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-zine-black">
		<!-- Top bar -->
		<div class="flex items-center justify-between border-b-2 border-white/10 px-6 py-3">
			<span
				class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/60 uppercase"
			>
				CREATETHINGS_PORTFOLIO
			</span>
			<span class="font-display text-[9px] font-bold tracking-widest text-white/20 uppercase">
				PUBLIC_VIEW
			</span>
		</div>

		<div class="mx-auto max-w-5xl px-6 py-12">
			<!-- Header — variant-aware hero -->
			{#if profileType === 'developer'}
				<header class="mb-16 border-b-2 border-white/10 pb-12">
					<p
						class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/40 uppercase"
					>
						CREATIVE_DEVELOPER
					</p>
					<h1
						class="mb-6 font-display text-5xl leading-none font-bold text-white uppercase sm:text-6xl"
					>
						ARCHITECTING THE
						<span class="bg-zine-yellow px-1 text-zine-black">KINETIC</span>
					</h1>
					{#if data.profile.bio}
						<p class="mt-4 max-w-lg font-body text-sm text-white/50">{data.profile.bio}</p>
					{/if}
					<div class="mt-8 flex flex-wrap gap-3">
						<div
							class="border-2 border-white/20 px-5 py-2 font-display text-[9px] font-bold tracking-widest text-white/50 uppercase"
						>
							OPEN_TO_WORK
						</div>
						{#if data.profile.creativeDna}
							<div
								class="border-2 border-zine-yellow bg-zine-yellow px-5 py-2 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
							>
								{data.profile.creativeDna}
							</div>
						{/if}
					</div>
				</header>
			{:else if profileType === 'content-creator'}
				<header class="mb-16 border-b-2 border-white/10 pb-12">
					<p
						class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/40 uppercase"
					>
						CONTENT_CREATOR
					</p>
					<h1
						class="mb-6 font-display text-5xl leading-none font-bold text-white uppercase sm:text-6xl"
					>
						CURATING THE CULTURE
					</h1>
					{#if data.profile.bio}
						<p class="mt-4 max-w-lg font-body text-sm text-white/50">{data.profile.bio}</p>
					{/if}
					<div class="mt-8 flex flex-wrap gap-3">
						<div
							class="border-2 border-zine-yellow bg-zine-yellow px-5 py-2 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
						>
							SUBSCRIBE
						</div>
						{#if data.profile.creativeDna}
							<div
								class="border-2 border-white/20 px-4 py-2 font-display text-[9px] font-bold tracking-widest text-white/50 uppercase"
							>
								{data.profile.creativeDna}
							</div>
						{/if}
					</div>
				</header>
			{:else if profileType === 'photographer'}
				<header class="mb-16 border-b-2 border-white/10 pb-12">
					<!-- Full-bleed banner placeholder / cover image -->
					<div class="mb-8 aspect-21/9 w-full overflow-hidden border-2 border-white/10 bg-white/5">
						<div class="flex h-full w-full items-end justify-start p-8">
							<div>
								<div class="mb-3 flex flex-wrap gap-2">
									<span
										class="bg-zine-yellow px-2 py-1 font-display text-[8px] font-bold tracking-widest text-zine-black uppercase"
									>
										URBAN EXPLORATION
									</span>
									<span
										class="bg-zine-yellow px-2 py-1 font-display text-[8px] font-bold tracking-widest text-zine-black uppercase"
									>
										BRUTALIST SPACES
									</span>
								</div>
								<h1
									class="font-display text-5xl leading-tight font-bold text-white uppercase sm:text-6xl"
								>
									THE UNFILTERED<br />LENS
								</h1>
							</div>
						</div>
					</div>
					{#if data.profile.bio}
						<p class="max-w-lg font-body text-sm text-white/50">{data.profile.bio}</p>
					{/if}
					<div class="mt-6 flex flex-wrap gap-3">
						<div
							class="border-2 border-zine-green bg-zine-green px-5 py-2 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
						>
							BOOK_A_SHOOT
						</div>
						{#if data.profile.creativeDna}
							<div
								class="border-2 border-white/20 px-4 py-2 font-display text-[9px] font-bold tracking-widest text-white/50 uppercase"
							>
								{data.profile.creativeDna}
							</div>
						{/if}
					</div>
				</header>
			{:else if profileType === 'designer'}
				<header class="mb-16 border-b-2 border-white/10 pb-12">
					<p
						class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/40 uppercase"
					>
						VISUAL_DESIGNER
					</p>
					<h1
						class="mb-6 font-display text-5xl leading-none font-bold text-white uppercase sm:text-6xl"
					>
						CRAFTING VISUAL
						<span class="bg-zine-purple/10 px-2 text-zine-purple italic">[LOGIC]</span>
					</h1>
					{#if data.profile.bio}
						<p class="mt-4 max-w-lg font-body text-sm text-white/50">{data.profile.bio}</p>
					{/if}
					<div class="mt-8 flex flex-wrap gap-3">
						<div
							class="border-2 border-zine-yellow bg-zine-yellow px-5 py-2 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
						>
							FULL_BREAKDOWN
						</div>
						<div
							class="border-2 border-white/20 px-5 py-2 font-display text-[9px] font-bold tracking-widest text-white/50 uppercase"
						>
							VIEW_MANIFESTO
						</div>
					</div>
				</header>
			{:else}
				<!-- generic / fallback -->
				<header class="mb-16 border-b-2 border-white/10 pb-12 text-center">
					<h1 class="mb-3 font-display text-5xl font-bold text-white uppercase">
						{data.profile.username}
					</h1>
					{#if data.profile.bio}
						<p class="mx-auto mt-4 max-w-xl font-body text-base text-white/50">
							{data.profile.bio}
						</p>
					{/if}
					{#if data.profile.creativeDna}
						<div
							class="mt-5 inline-block border-2 border-zine-yellow bg-zine-yellow px-4 py-2 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
						>
							{data.profile.creativeDna}
						</div>
					{/if}
				</header>
			{/if}

			<!-- Published Work -->
			{#if data.projects.length > 0}
				<section class="mb-20">
					<p
						class="mb-6 font-display text-[9px] font-bold tracking-[0.3em] text-white/30 uppercase"
					>
						WORK
					</p>
					<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.projects as project (project.id)}
							<button
								type="button"
								class="group border-2 text-left transition-colors duration-75 {expandedProject ===
								project.id
									? 'border-zine-yellow'
									: 'border-white/10 hover:border-zine-yellow/50'}"
								onclick={() => (expandedProject = project.id)}
							>
								{#if project.coverImage}
									<img
										src={project.coverImage}
										alt={project.title}
										class="aspect-video w-full object-cover"
									/>
								{/if}
								<div class="p-5">
									<h3 class="mb-2 font-display text-base font-bold text-white uppercase">
										{project.title}
									</h3>
									{#if project.remixTag}
										<span
											class="mb-2 inline-block bg-zine-yellow px-2 py-1 font-display text-[8px] font-bold tracking-widest text-zine-black uppercase"
										>
											{project.remixTag}
										</span>
									{/if}
									{#if project.dateCompleted}
										<p
											class="mt-3 font-display text-[9px] font-bold tracking-widest text-white/30 uppercase"
										>
											{project.dateCompleted}
										</p>
									{/if}
									<p
										class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-yellow/0 uppercase transition-colors duration-75 group-hover:text-zine-yellow/60"
									>
										View details &#8594;
									</p>
								</div>
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
					class="fixed inset-0 z-40 bg-black/80"
					aria-label="Close"
					onclick={() => (expandedProject = null)}
				></button>

				<!-- Panel -->
				<div
					class="fixed inset-x-4 top-16 bottom-0 z-50 mx-auto max-w-2xl overflow-y-auto border-2 border-white/20 bg-zine-black p-6 sm:inset-x-auto sm:top-12 sm:bottom-12 sm:left-1/2 sm:w-full sm:-translate-x-1/2"
				>
					<div class="mb-6 flex items-start justify-between gap-4">
						<div>
							<h2 class="font-display text-2xl font-bold text-white uppercase">
								{activeProject.title}
							</h2>
							{#if activeProject.remixTag}
								<span
									class="mt-2 inline-block bg-zine-yellow px-2 py-1 font-display text-[8px] font-bold tracking-widest text-zine-black uppercase"
								>
									{activeProject.remixTag}
								</span>
							{/if}
							{#if activeProject.dateCompleted}
								<p
									class="mt-2 font-display text-[9px] font-bold tracking-widest text-white/30 uppercase"
								>
									{activeProject.dateCompleted}
								</p>
							{/if}
						</div>
						<button
							type="button"
							class="shrink-0 border-2 border-white/20 p-2 font-display text-xs font-bold text-white/40 transition-colors hover:border-white/40 hover:text-white"
							aria-label="Close"
							onclick={() => (expandedProject = null)}
						>
							&#215;
						</button>
					</div>

					{#if activeProject.blocks?.length}
						<div class="space-y-4">
							{#each activeProject.blocks as block, bi (bi)}
								{#if block.type === 'heading_2'}
									<h2
										class="border-b-2 border-white/10 pb-2 font-display text-lg font-bold text-white uppercase"
									>
										{block.content}
									</h2>
								{:else if block.type === 'heading_3'}
									<h3 class="font-display text-base font-bold text-white/70 uppercase">
										{block.content}
									</h3>
								{:else if block.type === 'bulleted_list_item'}
									<p class="border-l-2 border-zine-yellow/30 pl-4 font-body text-sm text-white/50">
										{block.content}
									</p>
								{:else if block.type === 'image' && block.content}
									<img
										src={block.content}
										alt=""
										class="max-h-96 w-full border-2 border-white/10 object-contain"
									/>
								{:else if block.type === 'video' && block.content}
									{#if youtubeEmbed(block.content)}
										<iframe
											src={youtubeEmbed(block.content)}
											title="Video"
											class="aspect-video w-full border-2 border-white/10"
											frameborder="0"
											allowfullscreen
										></iframe>
									{:else}
										<a
											href={block.content}
											target="_blank"
											rel="external noopener noreferrer"
											class="font-body text-sm text-zine-yellow underline">{block.content}</a
										>
									{/if}
								{:else if block.type === 'divider'}
									<hr class="border-white/10" />
								{:else if block.content}
									<p class="font-body text-sm leading-relaxed text-white/50">{block.content}</p>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="font-body text-sm text-white/30">No additional content for this project.</p>
					{/if}
				</div>
			{/if}

			<!-- Learning Milestones -->
			{#if data.completedMilestones.length > 0}
				<section class="mb-20">
					<p
						class="mb-6 font-display text-[9px] font-bold tracking-[0.3em] text-white/30 uppercase"
					>
						LEARNING
					</p>
					<div class="grid gap-4 sm:grid-cols-2">
						{#each data.completedMilestones as milestone (milestone.id)}
							<div class="border-2 border-white/10 p-5 transition-colors hover:border-white/20">
								<h3 class="font-display text-base font-bold text-white uppercase">
									{milestone.title}
								</h3>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Inspiration Sources -->
			{#if data.inspirations.length > 0}
				<section class="mb-20">
					<p
						class="mb-6 font-display text-[9px] font-bold tracking-[0.3em] text-white/30 uppercase"
					>
						INSPIRATION
					</p>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{#each data.inspirations as insp (insp.id)}
							<div
								class="group overflow-hidden border-2 border-white/10 transition-colors hover:border-white/20"
							>
								{#if insp.imageUrl}
									<img
										src={insp.imageUrl}
										alt={insp.title}
										class="aspect-square w-full object-cover transition-transform group-hover:scale-105"
									/>
								{:else}
									<div class="flex aspect-square items-center justify-center bg-white/5">
										<span
											class="font-display text-[9px] font-bold tracking-widest text-white/20 uppercase"
										>
											NO_IMAGE
										</span>
									</div>
								{/if}
								<div class="border-t-2 border-white/10 p-3">
									<p class="truncate font-body text-sm text-white/70">{insp.title}</p>
									{#if insp.captureType}
										<p
											class="mt-0.5 font-display text-[8px] font-bold tracking-widest text-white/25 uppercase"
										>
											{insp.captureType}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Empty state -->
			{#if !data.projects.length && !data.completedMilestones.length && !data.inspirations.length}
				<div class="border-2 border-dashed border-white/10 py-24 text-center">
					<p
						class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-white/20 uppercase"
					>
						NO_CONTENT
					</p>
					<p class="font-body text-sm text-white/30">This portfolio is empty for now.</p>
				</div>
			{/if}

			<footer class="mt-16 border-t-2 border-white/10 pt-6">
				<div
					class="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left"
				>
					<!-- Left: credit -->
					<div>
						<p class="font-display text-[9px] font-bold tracking-[0.3em] text-white/20 uppercase">
							CREATETHINGS.CO — 2026
						</p>
						<p
							class="mt-1 font-display text-[9px] font-bold tracking-[0.2em] text-zine-yellow/40 uppercase"
						>
							STAY_VOID / UNFILTERED
						</p>
					</div>
					<!-- Right: social links -->
					{#if (data.profile as Record<string, unknown>).socialLinks}
						{@const links = (data.profile as Record<string, unknown>).socialLinks as Record<
							string,
							string
						>}
						<div class="flex flex-wrap justify-center gap-4 sm:justify-end">
							{#each Object.entries(links).filter(([, v]) => v) as [platform, url] (platform)}
								<a
									href={url}
									target="_blank"
									rel="noopener noreferrer"
									class="font-display text-[9px] font-bold tracking-widest text-white/30 uppercase transition-colors hover:text-zine-yellow"
								>
									{platform.toUpperCase()} ↗
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</footer>
		</div>
	</div>
{/if}
