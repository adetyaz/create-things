<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<!-- Placeholder landing page: the v1 Zine look stays until the UI redesign replaces it. -->
<div class="flex min-h-screen flex-col bg-zine-black text-zine-off-white">
	<!-- Minimal header -->
	<header class="flex items-center justify-between border-b-2 border-white/10 px-8 py-5">
		<span class="font-display text-lg font-bold tracking-tight">
			<span class="bg-zine-yellow px-1.5 py-0.5 text-zine-black">create</span><span
				class="text-white">things</span
			>
		</span>
	</header>

	<!-- Hero -->
	<section class="flex flex-1 flex-col justify-center px-8 py-24 md:px-16 lg:px-24">
		<div class="max-w-4xl">
			<h1
				class="mb-8 font-display text-[clamp(3rem,10vw,8rem)] leading-none font-bold tracking-tight uppercase"
			>
				PICK ONE THING.<br />
				<span class="inline-block bg-zine-yellow px-3 py-1 text-zine-black">START IT.</span>
			</h1>
			<p class="mb-4 font-display text-sm font-bold tracking-[0.2em] text-white/50 uppercase">
				CAPTURE · PICK ONE · START SMALL · REMEMBER
			</p>
			<p class="mb-12 max-w-lg font-body text-lg leading-relaxed text-white/60 md:text-xl">
				For people with too many ideas. Save what inspires you, let your pet help you pick one
				thing, break it into steps small enough to start today, and keep what you learn.
			</p>
			<div class="flex flex-wrap items-center gap-4">
				<a
					href="https://chromewebstore.google.com/detail/createthings/inemmheangfaedcdcmjgdobaopjcmeea"
					target="_blank"
					rel="noopener"
					class="border-2 border-zine-yellow bg-zine-yellow px-8 py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#FFE600] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
				>
					↓ GET THE EXTENSION
				</a>
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="border-t-2 border-white/10 bg-white/2 px-8 py-24 md:px-16 lg:px-24">
		<div class="mx-auto max-w-6xl">
			<div class="grid gap-0 border-2 border-white/10 md:grid-cols-3">
				{#each [{ n: '01', title: 'CAPTURE', body: 'Save links, screenshots, notes and Are.na channels. Then sort the pile down to a short list.' }, { n: '02', title: 'PICK ONE', body: 'Your pet suggests one thing that fits your time and energy, broken into 15–30 minute steps.' }, { n: '03', title: 'REMEMBER', body: 'Work in pomodoros, journal what you learn, and review it until it sticks. Your pet eats when you show up.' }] as step, i (step.n)}
					<div class="border-b-2 p-8 md:border-b-0 {i < 2 ? 'md:border-r-2' : ''} border-white/10">
						<p class="mb-4 font-display text-4xl font-bold text-zine-yellow">{step.n}</p>
						<h3 class="mb-4 font-display text-xl font-bold tracking-widest text-white uppercase">
							{step.title}
						</h3>
						<p class="font-body text-sm leading-relaxed text-white/50">{step.body}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="flex items-center justify-between border-t-2 border-white/10 px-8 py-6">
		<p class="font-display text-xs font-bold tracking-widest text-white/20 uppercase">
			CREATETHINGS — 2026
		</p>
		<a
			href={resolve('/privacy')}
			class="font-display text-xs font-bold tracking-widest text-white/20 uppercase hover:text-white/50"
		>
			PRIVACY
		</a>
	</footer>
</div>
