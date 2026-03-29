<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
	let testingDormant = $state(false);

	function triggerDormantTest() {
		testingDormant = true;
		window.location.href = '/?testDormant=1';
	}
</script>

{#if !data.connected}
	<!-- ═══════════════════════════════ LANDING PAGE ═══════════════════════════════ -->
	<div class="flex min-h-screen flex-col bg-zine-black text-zine-off-white">
		<!-- Minimal header -->
		<header class="flex items-center justify-between border-b-2 border-white/10 px-8 py-5">
			<span class="font-display text-lg font-bold tracking-tight">
				<span class="bg-zine-yellow px-1.5 py-0.5 text-zine-black">create</span><span
					class="text-white">things</span
				>
			</span>
			<a
				href={resolve('/api/notion/authorize')}
				class="font-display text-xs font-bold tracking-widest text-white/50 uppercase transition-colors hover:text-zine-yellow"
			>
				Connect Notion →
			</a>
		</header>

		<!-- Hero -->
		<section class="flex flex-1 flex-col justify-center px-8 py-24 md:px-16 lg:px-24">
			<div class="max-w-4xl">
				<p class="mb-8 font-display text-xs font-bold tracking-[0.3em] text-zine-yellow uppercase">
					OPERATOR_TOOLKIT — V1.0
				</p>
				<h1
					class="mb-8 font-display text-[clamp(3rem,10vw,8rem)] leading-none font-bold tracking-tight uppercase"
				>
					CREATIVE<br />
					<span class="inline-block bg-zine-yellow px-3 py-1 text-zine-black">ANARCHY.</span>
				</h1>
				<p class="mb-4 font-display text-sm font-bold tracking-[0.2em] text-white/50 uppercase">
					CAPTURE · BUILD · PUBLISH
				</p>
				<p class="mb-12 max-w-lg font-body text-lg leading-relaxed text-white/60 md:text-xl">
					The creative operator's toolkit. Clip inspiration from anywhere, build projects inside
					Notion, and broadcast your work across every channel.
				</p>
				<div class="flex flex-wrap items-center gap-4">
					<a
						href="#extension"
						class="border-2 border-zine-yellow bg-zine-yellow px-8 py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#FFE600] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
					>
						↓ GET THE EXTENSION
					</a>
					<a
						href={resolve('/api/notion/authorize')}
						class="border-2 border-white/30 px-8 py-4 font-display text-sm font-bold tracking-widest text-white/70 uppercase transition-colors hover:border-zine-yellow hover:text-zine-yellow"
					>
						CONNECT NOTION →
					</a>
				</div>
			</div>
		</section>

		<!-- Extension CTA -->
		<section id="extension" class="border-t-2 border-white/10 px-8 py-24 md:px-16 lg:px-24">
			<div class="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
				<!-- Text -->
				<div>
					<p
						class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-yellow uppercase"
					>
						QUICK_CAPTURE_V1
					</p>
					<h2 class="mb-6 font-display text-4xl leading-tight font-bold uppercase md:text-5xl">
						CLIP ANYTHING.<br />MISS NOTHING.
					</h2>
					<p class="mb-8 font-body leading-relaxed text-white/60">
						The createthings extension sits in your browser and lets you capture URLs, images,
						quotes, and notes in one click — straight into your Notion workspace.
					</p>
					<ul class="mb-10 space-y-3">
						{#each ['Capture any URL, image, or text', 'Add notes and labels instantly', 'Syncs directly into your Notion vault', 'Works on Chrome, Edge, and Firefox'] as feat}
							<li
								class="flex items-center gap-3 font-display text-sm font-bold tracking-wide uppercase"
							>
								<span class="text-zine-green">▸</span>
								<span class="text-white/80">{feat}</span>
							</li>
						{/each}
					</ul>
					<a
						href="https://chrome.google.com/webstore"
						target="_blank"
						rel="noopener"
						class="inline-block border-2 border-zine-yellow bg-zine-yellow px-8 py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_rgba(255,230,0,0.4)] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
					>
						↓ ADD TO BROWSER
					</a>
				</div>

				<!-- Extension popup mockup -->
				<div class="flex justify-center md:justify-end">
					<div class="w-80 border-2 border-white/20 bg-zine-black shadow-[8px_8px_0px_#FFE600]">
						<!-- Popup header -->
						<div class="flex items-center justify-between border-b-2 border-white/20 px-4 py-3">
							<span
								class="bg-zine-yellow px-2 py-0.5 font-display text-xs font-bold tracking-widest text-zine-black"
							>
								UNFILTERED
							</span>
							<div class="flex gap-4">
								{#each ['ARCH', 'LABS', 'NET'] as tab, i}
									<span
										class="font-display text-[10px] font-bold tracking-widest {i === 0
											? 'border-b border-zine-yellow text-zine-yellow'
											: 'text-white/30'}">{tab}</span
									>
								{/each}
							</div>
						</div>
						<!-- Popup body -->
						<div class="space-y-3 p-4">
							<div class="space-y-1 border-2 border-white/20 bg-white/5 p-3">
								<p
									class="font-display text-[10px] font-bold tracking-widest text-zine-yellow uppercase"
								>
									QUICK_CAPTURE_V1
								</p>
								<p class="font-display text-[10px] tracking-wider text-white/30 uppercase">
									SOURCE_ID: DISPATCH_###
								</p>
							</div>
							<!-- URL preview -->
							<div
								class="relative flex h-24 items-center justify-center overflow-hidden border-2 border-white/20 bg-white/5"
							>
								<div
									class="absolute inset-0 bg-linear-to-br from-zine-yellow/20 to-transparent opacity-20"
								></div>
								<!-- Corner brackets -->
								<span class="absolute top-1 left-1 font-mono text-xs leading-none text-zine-yellow"
									>┌</span
								>
								<span class="absolute top-1 right-1 font-mono text-xs leading-none text-zine-yellow"
									>┐</span
								>
								<span
									class="absolute bottom-1 left-1 font-mono text-xs leading-none text-zine-yellow"
									>└</span
								>
								<span
									class="absolute right-1 bottom-1 font-mono text-xs leading-none text-zine-yellow"
									>┘</span
								>
								<span class="font-display text-[10px] tracking-widest text-white/30 uppercase"
									>PREVIEW_IMG</span
								>
							</div>
							<!-- URL input -->
							<div class="border-2 border-white/20 px-3 py-2">
								<p
									class="mb-1 font-display text-[9px] font-bold tracking-widest text-white/30 uppercase"
								>
									CAPTURE_ORIGIN
								</p>
								<p class="truncate font-body text-[10px] text-white/50">
									https://example.com/article/...
								</p>
							</div>
							<!-- Notes -->
							<div class="h-12 border-2 border-white/20 px-3 py-2">
								<p
									class="font-display text-[9px] font-bold tracking-widest text-white/20 uppercase"
								>
									REDACTED NOTES HERE...
								</p>
							</div>
							<!-- Capture button -->
							<button
								class="w-full border-2 border-zine-yellow bg-zine-yellow py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(255,230,0,0.5)]"
							>
								⬡ CAPTURE
							</button>
						</div>
						<!-- Popup footer -->
						<div class="flex justify-between border-t-2 border-white/10 px-4 py-2">
							<span class="font-display text-[9px] tracking-wider text-white/20 uppercase"
								>TERMINAL_GRIP</span
							>
							<span class="font-display text-[9px] tracking-wider text-white/20 uppercase"
								>INITIAL_TRAP</span
							>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section class="border-t-2 border-white/10 bg-white/2 px-8 py-24 md:px-16 lg:px-24">
			<div class="mx-auto max-w-6xl">
				<p class="mb-12 font-display text-xs font-bold tracking-[0.3em] text-white/30 uppercase">
					OPERATIONAL_FLOW
				</p>
				<div class="grid gap-0 border-2 border-white/10 md:grid-cols-3">
					{#each [{ n: '01', title: 'CAPTURE', body: 'Install the extension. Clip anything that catches your eye — articles, images, tweets, links. Everything lands in your Notion vault.' }, { n: '02', title: 'BUILD', body: "Your vault feeds your projects. Write, think, and make things inside the workspace, backed by everything you've captured." }, { n: '03', title: 'PUBLISH', body: 'One command. Push your work across every channel — blog, newsletter, social — directly from createthings.' }] as step, i}
						<div
							class="border-b-2 p-8 md:border-b-0 {i < 2 ? 'md:border-r-2' : ''} border-white/10"
						>
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

		<!-- Connect CTA banner -->
		<section class="border-t-2 border-white/10 px-8 py-20 md:px-16 lg:px-24">
			<div
				class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center"
			>
				<h2 class="font-display text-3xl leading-tight font-bold uppercase md:text-4xl">
					READY TO<br /><span class="bg-zine-yellow px-2 text-zine-black">START MAKING?</span>
				</h2>
				<div class="flex flex-wrap gap-4">
					<a
						href={resolve('/api/notion/authorize')}
						class="border-2 border-zine-yellow bg-zine-yellow px-8 py-4 font-display text-sm font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_rgba(255,230,0,0.3)] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
					>
						CONNECT NOTION →
					</a>
					<p
						class="max-w-xs self-center font-display text-xs tracking-wider text-white/30 uppercase"
					>
						On the next screen, click Allow access — we'll create everything automatically.
					</p>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="flex items-center justify-between border-t-2 border-white/10 px-8 py-6">
			<p class="font-display text-xs font-bold tracking-widest text-white/20 uppercase">
				CREATETHINGS.CO — 2026
			</p>
			<p class="font-display text-xs font-bold tracking-widest text-white/20 uppercase">
				STAY_UNFILTERED
			</p>
		</footer>
	</div>
{:else}
	<!-- ═══════════════════════════════ DASHBOARD ═══════════════════════════════ -->
	<div class="min-h-screen bg-zine-off-white">
		<div class="mx-auto max-w-7xl px-6 py-10">
			<!-- Page header -->
			<div
				class="mb-6 flex flex-col gap-3 border-b-2 border-zine-black pb-6 sm:flex-row sm:items-start sm:justify-between"
			>
				<div>
					<p
						class="mb-1 font-display text-xs font-bold tracking-[0.3em] text-zine-black/40 uppercase"
					>
						OPERATOR_01
					</p>
					<h1 class="font-display text-3xl font-bold tracking-tight uppercase">
						INSPIRATION <span class="bg-zine-yellow px-2">STREAM_V5</span>
					</h1>
				</div>
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-zine-green shadow-[0_0_6px_#00FC40]"></span>
					<span class="font-display text-xs font-bold tracking-widest text-zine-black/40 uppercase"
						>CONNECTED</span
					>
				</div>
			</div>

			<!-- Filter tabs -->
			<div class="mb-8 flex items-center gap-0 border-b-2 border-zine-black">
				<button
					type="button"
					class="border-r-2 border-zine-black bg-zine-black px-6 py-2.5 font-display text-[10px] font-bold tracking-widest text-zine-yellow uppercase"
				>
					LIVE_FEED
				</button>
				<button
					type="button"
					class="px-6 py-2.5 font-display text-[10px] font-bold tracking-widest text-zine-black/40 uppercase transition-colors hover:text-zine-black"
				>
					RE-FILTERED
				</button>
			</div>

			{#if data.inspirations.length === 0}
				<!-- Empty state -->
				<div
					class="flex flex-col items-center gap-6 border-2 border-dashed border-zine-black/20 py-32 text-center"
				>
					<p class="font-display text-5xl font-bold tracking-widest text-zine-black/10 uppercase">
						VOID
					</p>
					<p class="font-display text-sm font-bold tracking-widest text-zine-black/40 uppercase">
						NO CAPTURES YET
					</p>
					<p class="max-w-xs font-body text-sm text-zine-black/40">
						Install the extension and start clipping. Your vault is empty and waiting.
					</p>
					<a
						href="https://chrome.google.com/webstore"
						target="_blank"
						rel="noopener"
						class="border-2 border-zine-black bg-zine-yellow px-6 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[4px_4px_0px_#0D0D0D] transition-all duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
					>
						↓ GET THE EXTENSION
					</a>
				</div>
			{:else}
				<!-- Dormant nudge -->
				{#if data.dormantProjects.length > 0}
					<div
						class="mb-6 border-2 border-zine-black bg-zine-yellow p-5 shadow-[4px_4px_0px_#0D0D0D]"
					>
						<h2 class="mb-1 font-display text-sm font-bold tracking-widest uppercase">
							{data.dormantProjects.length} PROJECT{data.dormantProjects.length > 1 ? 'S' : ''} GOING
							DORMANT
						</h2>
						<p class="mb-4 font-body text-xs text-zine-black/70 italic">"{data.dormantQuote}"</p>
						<div class="flex flex-col gap-2">
							{#each data.dormantProjects as proj (proj.id)}
								<div
									class="flex flex-wrap items-center justify-between gap-2 bg-zine-black px-4 py-2"
								>
									<div>
										<span
											class="font-display text-sm font-bold tracking-wide text-zine-off-white uppercase"
											>{proj.title}</span
										>
										<span
											class="ml-3 font-display text-xs tracking-wider text-zine-yellow/70 uppercase"
											>{proj.daysSince}D DORMANT</span
										>
									</div>
									<a
										href={resolve('/projects/[id]', { id: proj.id })}
										class="bg-zine-yellow px-3 py-1.5 font-display text-xs font-bold tracking-widest text-zine-black uppercase transition-colors hover:bg-white"
									>
										RESUME →
									</a>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="mb-6 flex justify-end">
						<button
							type="button"
							onclick={triggerDormantTest}
							disabled={testingDormant}
							class="border-2 border-dashed border-zine-black/20 px-4 py-1.5 font-display text-xs font-bold tracking-widest text-zine-black/30 uppercase transition-colors hover:border-zine-black/40 hover:text-zine-black/50 disabled:opacity-50"
						>
							{testingDormant ? 'LOADING...' : 'TEST_DORMANT'}
						</button>
					</div>
				{/if}

				<!-- Stale nudge -->
				{#if data.staleItems.length > 0}
					<div
						class="mb-6 border-2 border-zine-black bg-zine-off-white p-5 shadow-[4px_4px_0px_#0D0D0D]"
					>
						<h2 class="mb-3 font-display text-sm font-bold tracking-widest uppercase">
							{data.staleItems.length} INSPIRATION{data.staleItems.length > 1 ? 'S' : ''} GOING STALE
						</h2>
						<div class="flex flex-col gap-2">
							{#each data.staleItems as stale (stale.id)}
								<div
									class="flex flex-wrap items-center justify-between gap-2 border-2 border-zine-black bg-white px-4 py-2"
								>
									<span class="font-display text-sm font-bold tracking-wide uppercase"
										>{stale.title}</span
									>
									<a
										href={resolve('/inspiration/[id]', { id: stale.id })}
										class="bg-zine-black px-3 py-1.5 font-display text-xs font-bold tracking-widest text-zine-yellow uppercase transition-colors hover:bg-zine-yellow hover:text-zine-black"
									>
										START PROJECT →
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Vault grid -->
				<div
					class="grid grid-cols-1 gap-0 border-2 border-zine-black sm:grid-cols-2 lg:grid-cols-3"
				>
					{#each data.inspirations as item, i (item.id)}
						<a
							href={resolve('/inspiration/[id]', { id: item.id })}
							class="group relative border-r-2 border-b-2 border-zine-black bg-white p-5 transition-all hover:bg-zine-black hover:text-zine-off-white"
							style="border-right: {(i + 1) % 3 === 0
								? '0'
								: '2px solid #0D0D0D'}; border-right: 2px solid #0D0D0D"
						>
							{#if item.imageUrl}
								<div
									class="mb-4 h-36 overflow-hidden border-2 border-zine-black/0 bg-zine-black/5 group-hover:border-zine-yellow/30"
								>
									<img
										src={item.imageUrl}
										alt={item.title}
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								</div>
							{/if}

							<div class="mb-3 flex items-start justify-between gap-2">
								<h3
									class="line-clamp-2 font-display text-sm leading-snug font-bold tracking-wide uppercase"
								>
									{item.title}
								</h3>
								<span
									class="shrink-0 border px-2 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase
									{item.status === 'Ready'
										? 'border-zine-yellow bg-zine-yellow text-zine-black'
										: item.status === 'Active'
											? 'border-zine-green bg-zine-green text-zine-black'
											: item.status === 'Stale'
												? 'border-zine-black bg-zine-black text-zine-yellow group-hover:bg-zine-yellow group-hover:text-zine-black'
												: 'border-zine-black/30 text-zine-black/50 group-hover:border-white/30 group-hover:text-white/50'}"
								>
									{item.status}
								</span>
							</div>

							<div
								class="flex items-center gap-2 font-display text-[10px] font-bold tracking-widest text-zine-black/40 uppercase group-hover:text-white/40"
							>
								<span>{item.captureType}</span>
								{#if item.dateSaved}
									<span>·</span>
									<span>{new Date(item.dateSaved).toLocaleDateString()}</span>
								{/if}
							</div>

							{#if item.note}
								<p
									class="mt-2 line-clamp-2 font-body text-xs text-zine-black/40 group-hover:text-white/40"
								>
									{item.note}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			{/if}

			<!-- DISPATCH_HQ footer -->
			<div class="mt-16 flex items-center justify-between border-t-2 border-zine-black pt-6">
				<p class="font-display text-[10px] font-bold tracking-[0.3em] text-zine-black/25 uppercase">
					DISPATCH_HQ
				</p>
				<p class="font-display text-[10px] font-bold tracking-[0.3em] text-zine-black/25 uppercase">
					STAY_UNFILTERED
				</p>
			</div>
		</div>
	</div>
{/if}
