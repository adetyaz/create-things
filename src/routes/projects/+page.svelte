<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { data } = $props();

	function statusColor(s: string): string {
		switch (s) {
			case 'Done':
				return 'border-zine-green bg-zine-green text-zine-black';
			case 'In Progress':
				return 'border-zine-yellow bg-zine-yellow text-zine-black';
			case 'Ideating':
				return 'border-zine-black/20 text-zine-black/50';
			default:
				return 'border-zine-black/10 text-zine-black/30';
		}
	}

	function statusLabel(s: string): string {
		if (s === 'In Progress') return 'ACTIVE';
		return s.toUpperCase().replace(' ', '_');
	}
</script>

<svelte:head>
	<title>Projects — createthings</title>
</svelte:head>

<div class="min-h-screen bg-zine-off-white">
	<div class="mx-auto max-w-7xl px-6 py-10">
		<!-- Page header -->
		<div
			class="mb-8 flex flex-col gap-3 border-b-2 border-zine-black pb-6 sm:flex-row sm:items-end sm:justify-between"
		>
			<div>
				<p
					class="mb-1 font-display text-xs font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					VAULT
				</p>
				<h1 class="font-display text-3xl font-bold tracking-tight uppercase">
					CASE_<span class="bg-zine-yellow px-2">STUDIES</span>
				</h1>
			</div>
			<form method="POST" action="?/create" use:enhance>
				<button
					type="submit"
					class="border-2 border-zine-black bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#0D0D0D] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
				>
					+ NEW PROJECT
				</button>
			</form>
		</div>

		{#if data.projects.length === 0}
			<!-- Empty state -->
			<div
				class="flex flex-col items-center gap-6 border-2 border-dashed border-zine-black/20 py-32 text-center"
			>
				<p class="font-display text-5xl font-bold tracking-widest text-zine-black/10 uppercase">
					VOID
				</p>
				<p class="font-display text-sm font-bold tracking-widest text-zine-black/40 uppercase">
					NO PROJECTS YET
				</p>
				<p class="max-w-xs font-body text-sm text-zine-black/40">
					Start a project from an inspiration, or create one from scratch.
				</p>
				<form method="POST" action="?/create" use:enhance>
					<button
						type="submit"
						class="border-2 border-zine-black bg-zine-yellow px-6 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#0D0D0D] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
					>
						+ NEW PROJECT
					</button>
				</form>
			</div>
		{:else}
			<!-- Stats bar -->
			<div class="mb-8 flex flex-wrap gap-6 border-b-2 border-zine-black/10 pb-5">
				{#each [['ALL', data.projects.length], ['ACTIVE', data.projects.filter((p: { status: string }) => p.status === 'In Progress').length], ['DONE', data.projects.filter((p: { status: string }) => p.status === 'Done').length]] as [label, count] (label)}
					<div>
						<p class="font-display text-2xl font-bold text-zine-black">{count}</p>
						<p
							class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase"
						>
							{label}
						</p>
					</div>
				{/each}
			</div>

			<!-- Project grid -->
			<div class="grid grid-cols-1 gap-0 border-2 border-zine-black sm:grid-cols-2 lg:grid-cols-3">
				{#each data.projects as project (project.id)}
					<a
						href={resolve('/projects/[id]', { id: project.id })}
						class="group relative border-r-2 border-b-2 border-zine-black bg-white p-6 transition-colors hover:bg-zine-black"
					>
						<!-- Status badge -->
						<div class="mb-4 flex items-start justify-between gap-2">
							<h2
								class="line-clamp-2 font-display text-base leading-snug font-bold tracking-wide uppercase group-hover:text-zine-off-white"
							>
								{project.title}
							</h2>
							<span
								class="shrink-0 border px-2 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase {statusColor(
									project.status
								)}"
							>
								{statusLabel(project.status)}
							</span>
						</div>

						{#if project.remixTag}
							<span
								class="mb-3 inline-block border-2 border-zine-yellow bg-zine-yellow px-2 py-0.5 font-display text-[8px] font-bold tracking-widest text-zine-black uppercase"
							>
								{project.remixTag}
							</span>
						{/if}

						<div
							class="mt-auto flex flex-wrap items-center gap-2 font-display text-[10px] font-bold tracking-widest text-zine-black/40 uppercase group-hover:text-white/40"
						>
							{#if project.dateStarted}
								<span>STARTED {new Date(project.dateStarted).toLocaleDateString()}</span>
							{/if}
							{#if project.dateCompleted}
								<span>·</span>
								<span>DONE {new Date(project.dateCompleted).toLocaleDateString()}</span>
							{/if}
						</div>

						{#if project.isPublic}
							<div
								class="mt-2 font-display text-[9px] font-bold tracking-widest text-zine-black/25 uppercase group-hover:text-white/25"
							>
								PUBLIC ↗
							</div>
						{/if}

						<!-- Hover arrow -->
						<div
							class="absolute right-4 bottom-4 font-display text-xs font-bold text-zine-yellow opacity-0 transition-opacity group-hover:opacity-100"
						>
							→
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
