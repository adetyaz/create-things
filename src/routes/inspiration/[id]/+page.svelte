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
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inspirationId: data.inspiration.id })
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
			const response = await fetch('/api/roadmap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inspirationId: data.inspiration.id })
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

<div class="mx-auto max-w-4xl px-6 py-8">
	<!-- Back nav -->
	<a
		href={resolve('/')}
		class="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
	>
		&#8592; Back to Vault
	</a>

	<!-- Inspiration header -->
	<div class="mb-8">
		<div class="flex items-start justify-between gap-4">
			<h1 class="text-2xl font-medium text-gray-900">{data.inspiration.title}</h1>
			<span
				class="shrink-0 rounded-full px-3 py-1 text-xs font-medium
				{data.inspiration.status === 'Ready'
					? 'bg-teal-50 text-teal-700'
					: data.inspiration.status === 'Active'
						? 'bg-blue-50 text-blue-700'
						: data.inspiration.status === 'Stale'
							? 'bg-amber-50 text-amber-700'
							: 'bg-gray-100 text-gray-500'}"
			>
				{data.inspiration.status}
			</span>
		</div>

		<div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
			<span class="capitalize">{data.inspiration.captureType}</span>
			{#if data.inspiration.dateSaved}
				<span>&middot;</span>
				<span>{new Date(data.inspiration.dateSaved).toLocaleDateString()}</span>
			{/if}
			{#if data.inspiration.sourceUrl}
				<span>&middot;</span>
				<a
					href={data.inspiration.sourceUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="text-teal-600 hover:underline"
				>
					Source
				</a>
			{/if}
		</div>
	</div>

	<!-- Image preview -->
	{#if data.inspiration.imageUrl}
		<div class="mb-8 overflow-hidden rounded-xl border border-gray-200">
			<img
				src={data.inspiration.imageUrl}
				alt={data.inspiration.title}
				class="max-h-96 w-full object-contain"
			/>
		</div>
	{/if}

	<!-- User note -->
	{#if data.inspiration.note}
		<div class="mb-8 rounded-lg border border-gray-200 bg-white p-4">
			<p class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Note</p>
			<p class="text-sm text-gray-700">{data.inspiration.note}</p>
		</div>
	{/if}

	<!-- Analysis card -->
	{#if data.analysis}
		<div class="space-y-6">
			<h2 class="text-lg font-medium text-gray-800">AI Analysis</h2>

			{#if data.analysis.mood.length}
				<div class="flex flex-wrap gap-2">
					{#each data.analysis.mood as tag (tag)}
						<span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
							>{tag}</span
						>
					{/each}
				</div>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				{#if data.analysis.colors}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Colors</h3>
						<p class="text-sm text-gray-700">{data.analysis.colors}</p>
					</div>
				{/if}

				{#if data.analysis.typography}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
							Typography
						</h3>
						<p class="text-sm text-gray-700">{data.analysis.typography}</p>
					</div>
				{/if}

				{#if data.analysis.layout}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Layout</h3>
						<p class="text-sm text-gray-700">{data.analysis.layout}</p>
					</div>
				{/if}

				{#if data.analysis.style}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Style</h3>
						<p class="text-sm text-gray-700">{data.analysis.style}</p>
					</div>
				{/if}

				{#if data.analysis.components}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
							Components
						</h3>
						<p class="text-sm text-gray-700">{data.analysis.components}</p>
					</div>
				{/if}

				{#if data.analysis.attribution}
					<div class="rounded-lg border border-gray-200 bg-white p-4">
						<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
							Attribution
						</h3>
						<p class="text-sm text-gray-700">{data.analysis.attribution}</p>
					</div>
				{/if}
			</div>

			{#if data.analysis.forDevelopers}
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
						For Developers
					</h3>
					<p class="text-sm text-gray-700">{data.analysis.forDevelopers}</p>
				</div>
			{/if}

			{#if data.analysis.forCreators}
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
						For Creators
					</h3>
					<p class="text-sm text-gray-700">{data.analysis.forCreators}</p>
				</div>
			{/if}

			{#if data.analysis.suggestions}
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<h3 class="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
						Skills Needed
					</h3>
					<p class="text-sm text-gray-700">{data.analysis.suggestions}</p>
				</div>
			{/if}
		</div>
	{:else if data.inspiration.status === 'Pending'}
		<div
			class="flex flex-col items-center gap-4 rounded-lg border border-dashed border-gray-300 py-12 text-center"
		>
			{#if analyzing}
				<div
					class="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"
				></div>
				<p class="text-sm text-gray-400">Analyzing with AI...</p>
			{:else}
				<p class="text-sm text-gray-500">This item hasn't been analyzed yet.</p>
				<button
					onclick={analyzeNow}
					class="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
				>
					Analyze now
				</button>
				{#if analyzeError}
					<p class="text-xs text-red-500">{analyzeError}</p>
				{:else}
					<p class="text-xs text-gray-300">AI will extract colors, style, mood, and suggestions</p>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	<div class="mt-8 flex flex-wrap gap-3">
		{#if data.roadmapId}
			<a
				href={resolve('/roadmap/[id]', { id: data.roadmapId })}
				class="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
			>
				View Roadmap
			</a>
		{:else if data.analysis}
			<button
				onclick={buildRoadmap}
				disabled={buildingRoadmap}
				class="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
			>
				{buildingRoadmap ? 'Building...' : 'Build my roadmap'}
			</button>
		{/if}

		{#if data.projectIds.length}
			<a
				href={resolve('/projects/[id]', { id: data.projectIds[0] })}
				class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
			>
				View Project
			</a>
		{:else}
			<button
				onclick={startProject}
				disabled={startingProject}
				class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
			>
				{startingProject ? 'Creating...' : 'Start a project'}
			</button>
		{/if}

		{#if (data.inspiration.captureType === 'screenshot' || data.inspiration.captureType === 'upload') && data.inspiration.imageUrl}
			<button
				onclick={exportToFigma}
				disabled={exportingFigma}
				class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
			>
				{exportingFigma ? 'Exporting...' : 'Export to Figma'}
			</button>
		{/if}
	</div>

	{#if figmaResult === 'success'}
		<p class="mt-3 text-xs text-teal-600">Saved to Figma workspace!</p>
	{:else if figmaResult.startsWith('error:')}
		<p class="mt-3 text-xs text-red-500">{figmaResult.slice(6)}</p>
	{/if}

	{#if roadmapError}
		<p class="mt-3 text-xs text-red-500">{roadmapError}</p>
	{/if}

	{#if projectError}
		<p class="mt-3 text-xs text-red-500">{projectError}</p>
	{/if}
</div>
