<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div
	class="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-zine-off-white p-8 text-center"
>
	<!-- REDACTED watermark -->
	<div
		class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] select-none"
		aria-hidden="true"
	>
		<span
			class="font-display text-[20vw] leading-none font-bold tracking-tighter text-zine-black uppercase"
		>
			REDACTED
		</span>
	</div>

	<p class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/30 uppercase">
		ERROR
	</p>
	<div class="font-display text-8xl font-bold text-zine-black">{page.status}</div>
	<h1 class="font-display text-lg font-bold text-zine-black/60 uppercase">
		{page.error?.message || 'Something went wrong'}
	</h1>
	<a
		href={resolve('/')}
		class="mt-4 border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
	>
		&#8592; Back to Vault
	</a>
</div>
