<script lang="ts">
	let {
		onReset,
		pageId = '',
		apiBase = 'https://create-things.vercel.app'
	}: { onReset: () => void; pageId?: string; apiBase?: string } = $props();

	function viewInDashboard() {
		const url = pageId ? `${apiBase}/inspiration/${pageId}` : `${apiBase}/`;
		chrome.tabs.create({ url });
		window.close();
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
	<div>
		<p class="mb-4 font-display text-[10px] font-bold tracking-[0.3em] text-zine-green uppercase">
			DISPATCH_CONFIRMED
		</p>
		<div class="mb-2 font-display text-5xl font-bold text-zine-yellow">✓</div>
		<h2 class="mb-2 font-display text-xl font-bold tracking-widest uppercase">CAPTURED</h2>
		<p class="font-body text-xs text-white/60">
			Saved to your Notion vault · AI analysis in progress
		</p>
	</div>
	<div class="flex w-full flex-col gap-2">
		<button
			onclick={viewInDashboard}
			class="w-full border-2 border-zine-yellow bg-zine-yellow py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.3)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
		>
			→ VIEW IN DASHBOARD
		</button>
		<button
			onclick={onReset}
			class="w-full border-2 border-white/30 py-3 font-display text-xs font-bold tracking-widest text-white/60 uppercase transition-colors hover:border-white/50 hover:text-white/90"
		>
			CAPTURE AGAIN
		</button>
	</div>
</div>
