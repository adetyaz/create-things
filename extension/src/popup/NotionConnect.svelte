<script lang="ts">
	const API_BASE = 'http://localhost:5173';

	function connectNotion() {
		chrome.tabs.create({ url: `${API_BASE}/api/notion/authorize` });
		window.close();
	}
</script>

<div class="flex w-125 flex-col bg-zine-black text-zine-off-white" style="min-height: 480px;">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b-2 border-white/10 px-4 py-3">
		<span
			class="bg-zine-yellow px-2 py-0.5 font-display text-xs font-bold tracking-tight text-zine-black"
			>UNFILTERED</span
		>
		<div class="flex items-center gap-4">
			{#each ['ARCHIVE', 'LABS', 'NETWORK'] as tab (tab)}
				<span class="font-display text-[9px] font-bold tracking-widest text-white/40 uppercase"
					>{tab}</span
				>
			{/each}
		</div>
		<span class="font-display text-[9px] tracking-widest text-white/40 uppercase">⚙</span>
	</div>

	<!-- Connect content -->
	<div class="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-12 text-center">
		<div>
			<p
				class="mb-4 font-display text-[10px] font-bold tracking-[0.3em] text-zine-yellow uppercase"
			>
				OPERATOR_INIT
			</p>
			<h1 class="mb-4 font-display text-3xl leading-tight font-bold uppercase">
				CONNECT<br /><span class="bg-zine-yellow px-2 text-zine-black">NOTION</span>
			</h1>
			<p class="max-w-xs font-body text-sm leading-relaxed text-white/70">
				Link your Notion workspace to start capturing inspiration directly into your vault.
			</p>
		</div>

		<div class="flex w-full flex-col gap-3">
			<button
				onclick={connectNotion}
				class="w-full border-2 border-zine-yellow bg-zine-yellow py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
			>
				→ CONNECT WORKSPACE
			</button>
			<a
				href="https://www.notion.so/desktop"
				target="_blank"
				rel="noopener noreferrer"
				class="font-display text-[10px] font-bold tracking-widest text-white/40 uppercase transition-colors hover:text-white/60"
			>
				DON'T HAVE NOTION? GET IT HERE
			</a>
		</div>
	</div>

	<!-- Footer -->
	<div class="flex items-center justify-between border-t-2 border-white/10 px-4 py-2">
		<span class="font-display text-[8px] font-bold tracking-widest text-white/25 uppercase"
			>TERMINAL_GRIP_DOME</span
		>
		<span class="font-display text-[8px] font-bold tracking-widest text-white/25 uppercase"
			>INITIAL_TRAP</span
		>
	</div>
</div>
