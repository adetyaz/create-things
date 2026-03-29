<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { addToast } from '$lib/toast.svelte.js';

	let { data } = $props();
	let buildingRoadmap = $state(false);
	let roadmapError = $state('');
	let exportingFigma = $state(false);
	let figmaResult = $state('');
	let analyzing = $state(false);
	let analyzeError = $state('');
	let startingProject = $state(false);
	let projectError = $state('');

	// Auto-poll while analysis is pending (e.g. triggered externally)
	$effect(() => {
		if (data.inspiration.status === 'Pending' && !data.analysis) {
			const id = setInterval(() => invalidateAll(), 5000);
			return () => clearInterval(id);
		}
	});

	async function analyzeNow() {
		if (analyzing) return;
		analyzing = true;
		analyzeError = '';
		try {
			const profile = JSON.parse(localStorage.getItem('ct_creator_profile') || '{}');
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					inspirationId: data.inspiration.id,
					profession: profile.profession || undefined,
					professionDetail: profile.detail || undefined
				})
			});
			if (!res.ok) {
				const body = await res.json();
				analyzeError = body.error || 'Analysis failed';
				addToast(analyzeError, 'error');
				return;
			}
			addToast('Analysis complete!', 'success');
			await invalidateAll();
		} catch (err) {
			analyzeError = String(err);
			addToast(analyzeError, 'error');
		} finally {
			analyzing = false;
		}
	}

	async function buildRoadmap() {
		buildingRoadmap = true;
		roadmapError = '';

		try {
			const profile = JSON.parse(localStorage.getItem('ct_creator_profile') || '{}');
			const response = await fetch('/api/roadmap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					inspirationId: data.inspiration.id,
					profession: profile.profession || undefined,
					professionDetail: profile.detail || undefined
				})
			});

			if (!response.ok) {
				const text = await response.text();
				roadmapError = text;
				return;
			}

			const result = await response.json();
			// Navigate to the new roadmap
			window.location.href = `/roadmap/${result.roadmapId}`;
		} catch (err) {
			roadmapError = String(err);
		} finally {
			buildingRoadmap = false;
		}
	}

	async function startProject() {
		startingProject = true;
		projectError = '';
		try {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inspirationId: data.inspiration.id })
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

	async function exportToFigma() {
		exportingFigma = true;
		figmaResult = '';

		try {
			const response = await fetch('/api/figma/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inspirationId: data.inspiration.id })
			});

			if (!response.ok) {
				const text = await response.text();
				figmaResult = `error:${text}`;
				return;
			}

			figmaResult = 'success';
		} catch (err) {
			figmaResult = `error:${String(err)}`;
		} finally {
			exportingFigma = false;
		}
	}
</script>

<div class="min-h-screen bg-zine-off-white">
	<div class="mx-auto max-w-4xl px-6 py-10">
		<!-- Back nav -->
		<a
			href={resolve('/')}
			class="mb-8 inline-flex items-center gap-2 font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase transition-colors hover:text-zine-black"
		>
			&#8592; BACK TO VAULT
		</a>

		<!-- Inspiration header -->
		<div class="mb-8 border-b-2 border-zine-black pb-6">
			<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<h1 class="font-display text-2xl leading-tight font-bold text-zine-black uppercase">
					{data.inspiration.title}
				</h1>
				<span
					class="shrink-0 self-start border-2 px-3 py-1.5 font-display text-[9px] font-bold tracking-widest uppercase
					{data.inspiration.status === 'Ready'
						? 'border-zine-green bg-zine-green text-zine-black'
						: data.inspiration.status === 'Active'
							? 'border-zine-yellow bg-zine-yellow text-zine-black'
							: data.inspiration.status === 'Stale'
								? 'border-zine-black/30 bg-transparent text-zine-black/50'
								: 'border-zine-black/15 bg-transparent text-zine-black/30'}"
				>
					{data.inspiration.status}
				</span>
			</div>

			<div
				class="flex flex-wrap items-center gap-3 font-display text-[9px] font-bold tracking-widest text-zine-black/35 uppercase"
			>
				<span>{data.inspiration.captureType}</span>
				{#if data.inspiration.dateSaved}
					<span>·</span>
					<span>{new Date(data.inspiration.dateSaved).toLocaleDateString()}</span>
				{/if}
				{#if data.inspiration.sourceUrl}
					<span>·</span>
					<a
						href={data.inspiration.sourceUrl}
						target="_blank"
						rel="external noopener noreferrer"
						class="text-zine-black/60 underline transition-colors hover:text-zine-black"
					>
						SOURCE →
					</a>
				{/if}
			</div>
		</div>

		<!-- Image preview -->
		{#if data.inspiration.imageUrl}
			<div class="mb-8 overflow-hidden border-2 border-zine-black">
				<img
					src={data.inspiration.imageUrl}
					alt={data.inspiration.title}
					class="max-h-96 w-full object-contain"
				/>
			</div>
		{/if}

		<!-- User note -->
		{#if data.inspiration.note}
			<div class="mb-8 border-2 border-zine-black/20 bg-white p-5">
				<p
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					OBSERVATIONS
				</p>
				<p class="font-body text-sm leading-relaxed text-zine-black/70">{data.inspiration.note}</p>
			</div>
		{/if}

		<!-- Analysis card -->
		{#if data.analysis}
			<div class="mb-8 space-y-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p
						class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
					>
						AI_ANALYSIS
					</p>
					{#if data.analysis.mood.length}
						<div class="flex flex-wrap gap-2">
							{#each data.analysis.mood as tag (tag)}
								<span
									class="bg-zine-black px-3 py-1.5 font-display text-[8px] font-bold tracking-widest text-zine-off-white uppercase"
									>{tag}</span
								>
							{/each}
						</div>
					{/if}
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					{#if data.analysis.colors}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								COLORS
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.colors}</p>
						</div>
					{/if}

					{#if data.analysis.typography}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								TYPOGRAPHY
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.typography}</p>
						</div>
					{/if}

					{#if data.analysis.layout}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								LAYOUT
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.layout}</p>
						</div>
					{/if}

					{#if data.analysis.style}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								STYLE
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.style}</p>
						</div>
					{/if}

					{#if data.analysis.components}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								COMPONENTS
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.components}</p>
						</div>
					{/if}

					{#if data.analysis.attribution}
						<div class="border-2 border-zine-black/10 bg-white p-4">
							<h3
								class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
							>
								ATTRIBUTION
							</h3>
							<p class="font-body text-sm text-zine-black/70">{data.analysis.attribution}</p>
						</div>
					{/if}
				</div>

				{#if data.analysis.forDevelopers}
					<div class="border-2 border-zine-black/10 bg-white p-4">
						<h3
							class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
						>
							FOR_DEVELOPERS
						</h3>
						<p class="font-body text-sm text-zine-black/70">{data.analysis.forDevelopers}</p>
					</div>
				{/if}

				{#if data.analysis.forCreators}
					<div class="border-2 border-zine-black/10 bg-white p-4">
						<h3
							class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
						>
							FOR_CREATORS
						</h3>
						<p class="font-body text-sm text-zine-black/70">{data.analysis.forCreators}</p>
					</div>
				{/if}

				{#if data.analysis.suggestions}
					<div class="border-2 border-zine-black/10 bg-white p-4">
						<h3
							class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
						>
							SKILLS_NEEDED
						</h3>
						<p class="font-body text-sm text-zine-black/70">{data.analysis.suggestions}</p>
					</div>
				{/if}
			</div>
		{:else if data.inspiration.status === 'Pending'}
			<div
				class="mb-8 flex flex-col items-center gap-4 border-2 border-dashed border-zine-black/20 py-14 text-center"
			>
				{#if analyzing}
					<div class="h-5 w-5 animate-spin border-2 border-zine-black border-t-transparent"></div>
					<p
						class="font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase"
					>
						ANALYZING...
					</p>
				{:else}
					<p
						class="font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase"
					>
						ANALYSIS_PENDING
					</p>
					<button
						onclick={analyzeNow}
						class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
					>
						→ ANALYZE NOW
					</button>
					{#if analyzeError}
						<p class="font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
							{analyzeError}
						</p>
					{:else}
						<p class="font-display text-[8px] tracking-widest text-zine-black/25 uppercase">
							AI will extract colors, style, mood, and suggestions
						</p>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-wrap gap-3 pt-2">
			{#if data.roadmapId}
				<a
					href={resolve('/roadmap/[id]', { id: data.roadmapId })}
					class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
				>
					→ VIEW ROADMAP
				</a>
			{:else if data.analysis}
				<button
					onclick={buildRoadmap}
					disabled={buildingRoadmap}
					class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
				>
					{buildingRoadmap ? 'BUILDING...' : '→ BUILD ROADMAP'}
				</button>
			{/if}

			{#if data.projectIds.length}
				<a
					href={resolve('/projects/[id]', { id: data.projectIds[0] })}
					class="border-2 border-zine-black px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase transition-colors duration-75 hover:bg-zine-black hover:text-white"
				>
					VIEW PROJECT
				</a>
			{:else}
				<button
					onclick={startProject}
					disabled={startingProject}
					class="border-2 border-zine-black px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase transition-colors duration-75 hover:bg-zine-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
				>
					{startingProject ? 'CREATING...' : 'START PROJECT'}
				</button>
			{/if}

			{#if (data.inspiration.captureType === 'screenshot' || data.inspiration.captureType === 'upload') && data.inspiration.imageUrl}
				<button
					onclick={exportToFigma}
					disabled={exportingFigma}
					class="border-2 border-zine-black/30 px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black/50 uppercase transition-colors duration-75 hover:border-zine-black hover:text-zine-black disabled:cursor-not-allowed disabled:opacity-40"
				>
					{exportingFigma ? 'EXPORTING...' : 'EXPORT TO FIGMA'}
				</button>
			{/if}
		</div>

		{#if figmaResult === 'success'}
			<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase">
				✓ SAVED_TO_FIGMA
			</p>
		{:else if figmaResult.startsWith('error:')}
			<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
				{figmaResult.slice(6)}
			</p>
		{/if}

		{#if roadmapError}
			<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
				{roadmapError}
			</p>
		{/if}

		{#if projectError}
			<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
				{projectError}
			</p>
		{/if}
	</div>
</div>
