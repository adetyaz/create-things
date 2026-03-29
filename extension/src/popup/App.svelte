<script lang="ts">
	import NotionConnect from './NotionConnect.svelte';
	import CaptureURL from './CaptureURL.svelte';
	import CaptureNote from './CaptureNote.svelte';
	import CaptureUpload from './CaptureUpload.svelte';
	import CaptureScreenshot from './CaptureScreenshot.svelte';
	import { checkNotionConnection, setConnected } from '../background/notion-check';

	type View = 'loading' | 'connect' | 'url' | 'note' | 'upload' | 'screenshot';

	let view = $state<View>('loading');

	$effect(() => {
		checkNotionConnection().then((status) => {
			setConnected(status.connected);
			view = status.connected ? 'url' : 'connect';
		});
	});

	const navItems: { id: Exclude<View, 'loading' | 'connect'>; label: string; sub: string }[] = [
		{ id: 'url', label: 'URL', sub: 'CURRENT PAGE' },
		{ id: 'note', label: 'NOTE', sub: 'QUICK THOUGHT' },
		{ id: 'upload', label: 'UPLOAD', sub: 'SEND IMAGE' },
		{ id: 'screenshot', label: 'SCREEN', sub: 'CAPTURE VIEW' }
	];
</script>

<div class="flex w-125 flex-col bg-zine-black text-zine-off-white" style="min-height: 480px;">
	{#if view === 'loading'}
		<div class="flex flex-1 items-center justify-center">
			<div class="flex flex-col items-center gap-4">
				<div class="h-5 w-5 animate-spin border-2 border-zine-yellow border-t-transparent"></div>
				<p class="font-display text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">
					SCANNING...
				</p>
			</div>
		</div>
	{:else if view === 'connect'}
		<NotionConnect />
	{:else}
		<!-- Top bar -->
		<div class="flex shrink-0 items-center justify-between border-b-2 border-white/10 px-4 py-3">
			<span
				class="bg-zine-yellow px-2 py-0.5 font-display text-xs font-bold tracking-tight text-zine-black"
				>UNFILTERED</span
			>
			<div class="flex items-center gap-4">
				{#each ['ARCHIVE', 'LABS', 'NETWORK'] as tab, i (i)}
					<span
						class="font-display text-[9px] font-bold tracking-widest uppercase {i === 0
							? 'border-b border-zine-yellow pb-px text-zine-yellow'
							: 'text-white/60'}">{tab}</span
					>
				{/each}
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-1.5 w-1.5 rounded-full bg-zine-green" style="box-shadow: 0 0 4px #00FC40;"
				></span>
				<span class="font-display text-[9px] font-bold tracking-widest text-white/70 uppercase"
					>LIVE</span
				>
			</div>
		</div>

		<!-- Sidebar + content -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Sidebar -->
			<div class="flex w-28 shrink-0 flex-col border-r-2 border-white/10 py-3">
				<div class="mb-3 border-b border-white/10 px-3 pb-3">
					<p class="font-display text-[8px] font-bold tracking-[0.25em] text-white/60 uppercase">
						OPERATOR_01
					</p>
					<p class="mt-0.5 font-display text-[8px] tracking-wide text-white/60 uppercase">
						UNFILTERED
					</p>
				</div>
				<nav class="flex flex-1 flex-col gap-px px-2">
					{#each navItems as item (item.id)}
						<button
							onclick={() => (view = item.id)}
							class="w-full px-2 py-2.5 text-left transition-colors {view === item.id
								? 'bg-zine-yellow text-zine-black'
								: 'text-white/70 hover:bg-white/5 hover:text-white'}"
						>
							<p class="font-display text-[10px] leading-tight font-bold tracking-widest uppercase">
								{item.label}
							</p>
							<p
								class="mt-0.5 font-display text-[7px] tracking-wider uppercase {view === item.id
									? 'text-zine-black/50'
									: 'text-white/50'}"
							>
								{item.sub}
							</p>
						</button>
					{/each}
				</nav>
				<div class="mt-2 border-t border-white/10 px-2 pt-2">
					<button
						onclick={() => {
							view = 'connect';
						}}
						class="w-full px-2 py-2 text-left text-white/60 transition-colors hover:text-white/90"
					>
						<p class="font-display text-[9px] tracking-widest uppercase">⚙ CONFIG</p>
					</button>
				</div>
			</div>

			<!-- Main content -->
			<div class="flex min-w-0 flex-1 flex-col overflow-y-auto">
				{#if view === 'url'}
					<CaptureURL />
				{:else if view === 'note'}
					<CaptureNote />
				{:else if view === 'upload'}
					<CaptureUpload />
				{:else if view === 'screenshot'}
					<CaptureScreenshot />
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="flex shrink-0 items-center justify-between border-t-2 border-white/10 px-4 py-2">
			<span class="font-display text-[8px] font-bold tracking-widest text-white/30 uppercase"
				>TERMINAL_GRIP_DOME</span
			>
			<span class="font-display text-[8px] font-bold tracking-widest text-white/30 uppercase"
				>INITIAL_TRAP</span
			>
		</div>
	{/if}
</div>
