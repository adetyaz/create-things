<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	let { data, form } = $props();
	let copiedHeader = $state(false);
	let copiedBody = $state(false);

	const STORAGE_KEY = 'ct_creator_profile';
	const PROFESSIONS = [
		'Designer',
		'Developer',
		'Photographer',
		'Filmmaker',
		'Illustrator',
		'Writer',
		'Other'
	];

	let profileProfession = $state('');
	let profileDetail = $state('');
	let profileSaved = $state(false);

	onMount(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			profileProfession = parsed.profession || '';
			profileDetail = parsed.detail || '';
		}
	});

	function saveProfile() {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ profession: profileProfession, detail: profileDetail.trim() })
		);
		profileSaved = true;
		setTimeout(() => (profileSaved = false), 2000);
	}

	const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/notion`;

	function copyText(text: string, which: 'header' | 'body') {
		navigator.clipboard.writeText(text);
		if (which === 'header') {
			copiedHeader = true;
			setTimeout(() => (copiedHeader = false), 1500);
		} else {
			copiedBody = true;
			setTimeout(() => (copiedBody = false), 1500);
		}
	}
</script>

<div class="min-h-screen bg-zine-off-white">
	<div class="mx-auto max-w-2xl px-6 py-10">
		<!-- Back nav -->
		<a
			href={resolve('/')}
			class="mb-8 inline-flex items-center gap-2 font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase transition-colors hover:text-zine-black"
		>
			&#8592; BACK TO VAULT
		</a>

		<div class="mb-10 border-b-2 border-zine-black pb-6">
			<p
				class="mb-1 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				CONFIG
			</p>
			<h1 class="font-display text-3xl font-bold text-zine-black uppercase">SETTINGS</h1>
		</div>

		<!-- Notion connection -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				NOTION_CONNECTION
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<div class="mb-4 flex items-center gap-3">
					<span
						class="h-2 w-2 rounded-full {data.connected ? 'bg-zine-green' : 'bg-red-500'}"
						style={data.connected ? 'box-shadow: 0 0 6px #00FC40;' : ''}
					></span>
					<span class="font-display text-xs font-bold tracking-widest text-zine-black/70 uppercase">
						{data.connected ? 'WORKSPACE_CONNECTED' : 'NOT_CONNECTED'}
					</span>
				</div>
				{#if !data.connected}
					<a
						href={resolve('/api/notion/authorize')}
						class="inline-block border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
					>
						→ CONNECT NOTION
					</a>
				{/if}
			</div>
		</section>

		<!-- Figma connection -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				FIGMA_EXPORT
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<div class="mb-4 flex items-center gap-3">
					<span
						class="h-2 w-2 rounded-full {data.figmaConnected
							? 'bg-zine-green'
							: 'bg-zine-black/20'}"
						style={data.figmaConnected ? 'box-shadow: 0 0 6px #00FC40;' : ''}
					></span>
					<span class="font-display text-xs font-bold tracking-widest text-zine-black/70 uppercase">
						{data.figmaConnected ? 'FIGMA_CONNECTED' : 'NOT_CONNECTED'}
					</span>
				</div>

				<form method="POST" action="?/figma" use:enhance>
					<label
						for="figma-key"
						class="mb-1 block font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						FIGMA_FILE_KEY
						<span
							class="font-body text-[10px] font-normal tracking-normal text-zine-black/30 normal-case"
						>
							(figma.com/file/<strong>KEY</strong>/...)</span
						>
					</label>
					<div class="flex gap-2">
						<input
							id="figma-key"
							type="text"
							name="fileKey"
							value={data.figmaFileKey}
							placeholder="paste-file-key-here"
							class="flex-1 border-b-2 border-zine-black/20 bg-transparent pb-2 font-body text-sm text-zine-black placeholder-zine-black/25 transition-colors outline-none focus:border-zine-black"
						/>
						<button
							type="submit"
							class="bg-zine-black px-4 py-2 font-display text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-zine-black/80"
						>
							SAVE
						</button>
					</div>
				</form>

				{#if form?.figmaSaved}
					<p
						class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
					>
						✓ FIGMA_KEY_SAVED
					</p>
				{/if}
			</div>
		</section>

		<!-- Stale threshold -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				STALE_THRESHOLD
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<form method="POST" action="?/stale" use:enhance>
					<label
						for="stale-threshold"
						class="mb-3 block font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						DAYS_BEFORE_MARKED_STALE
					</label>
					<div class="flex flex-wrap items-center gap-4">
						<input
							id="stale-threshold"
							type="number"
							name="threshold"
							value={data.staleThreshold}
							min="1"
							max="365"
							class="w-20 border-2 border-zine-black/20 bg-transparent px-3 py-2 text-center font-body text-sm text-zine-black transition-colors outline-none focus:border-zine-black"
						/>
						<span
							class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase"
							>DAYS</span
						>
						<button
							type="submit"
							class="bg-zine-black px-4 py-2 font-display text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-zine-black/80"
						>
							UPDATE
						</button>
					</div>
				</form>

				{#if form?.staleSaved}
					<p
						class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
					>
						✓ THRESHOLD_UPDATED
					</p>
				{/if}
			</div>
		</section>

		<!-- Dormant project threshold -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				DORMANT_PROJECTS
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<p class="mb-4 font-body text-xs leading-relaxed text-zine-black/50">
					Projects marked <strong class="font-semibold text-zine-black/70">In Progress</strong> that haven't
					been updated in this many days will appear as a reminder on your dashboard.
				</p>
				<form method="POST" action="?/dormant" use:enhance>
					<label
						for="dormant-days"
						class="mb-3 block font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						DAYS_BEFORE_DORMANT
					</label>
					<div class="flex flex-wrap items-center gap-4">
						<input
							id="dormant-days"
							type="number"
							name="dormantDays"
							value={data.dormantDays}
							min="1"
							max="365"
							class="w-20 border-2 border-zine-black/20 bg-transparent px-3 py-2 text-center font-body text-sm text-zine-black transition-colors outline-none focus:border-zine-black"
						/>
						<span
							class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase"
							>DAYS</span
						>
						<button
							type="submit"
							class="bg-zine-black px-4 py-2 font-display text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-zine-black/80"
						>
							UPDATE
						</button>
					</div>
				</form>
				{#if form?.dormantSaved}
					<p
						class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
					>
						✓ THRESHOLD_UPDATED
					</p>
				{/if}
			</div>
		</section>

		<!-- Connected platforms -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				PUBLISH_PLATFORMS
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				{#if data.platforms.length}
					<div class="flex flex-wrap gap-2">
						{#each data.platforms as platform (platform)}
							<span
								class="border-2 border-zine-black bg-zine-yellow px-3 py-1.5 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase"
							>
								{platform}
							</span>
						{/each}
					</div>
				{:else}
					<p class="font-body text-xs text-zine-black/40">
						No platforms connected yet. Connect Buffer to start publishing.
					</p>
				{/if}
			</div>
		</section>

		<!-- Your profile -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				YOUR_PROFILE
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<p class="mb-5 font-body text-xs leading-relaxed text-zine-black/50">
					Your role shapes how analysis and roadmaps are written. A photographer gets shot technique
					and location advice. A developer gets implementation patterns.
				</p>

				<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each PROFESSIONS as p (p)}
						<button
							type="button"
							onclick={() => (profileProfession = p)}
							class="border-2 px-3 py-2.5 font-display text-[9px] font-bold tracking-widest uppercase transition-all duration-75
								{profileProfession === p
								? 'border-zine-black bg-zine-yellow text-zine-black'
								: 'border-zine-black/20 text-zine-black/40 hover:border-zine-black hover:text-zine-black'}"
						>
							{p}
						</button>
					{/each}
				</div>

				{#if profileProfession}
					<div class="mb-4">
						<label
							for="profile-detail"
							class="mb-1 block font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
						>
							SPECIALISATION <span
								class="font-body text-[10px] font-normal text-zine-black/30 normal-case"
								>(optional)</span
							>
						</label>
						<input
							id="profile-detail"
							type="text"
							bind:value={profileDetail}
							placeholder={profileProfession === 'Other'
								? 'e.g. motion designer, ceramicist'
								: `e.g. street ${profileProfession.toLowerCase()}, portrait ${profileProfession.toLowerCase()}`}
							class="w-full border-b-2 border-zine-black/20 bg-transparent pb-2 font-body text-sm text-zine-black placeholder-zine-black/25 transition-colors outline-none focus:border-zine-black"
						/>
					</div>
				{/if}

				<button
					type="button"
					onclick={saveProfile}
					class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
				>
					SAVE PROFILE
				</button>

				{#if profileSaved}
					<p
						class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
					>
						✓ PROFILE_SAVED
					</p>
				{/if}
			</div>
		</section>

		<!-- Portfolio -->
		{#if data.connected}
			<section class="mb-8">
				<h2
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					PORTFOLIO
				</h2>
				<div class="border-2 border-zine-black bg-white p-5">
					<p class="mb-5 font-body text-xs leading-relaxed text-zine-black/50">
						Make your portfolio publicly shareable at <span class="font-mono text-zine-black/70"
							>/portfolio/YOUR_USERNAME</span
						>.
					</p>
					<form method="POST" action="?/profile" use:enhance>
						<div class="mb-4">
							<label
								for="portfolio-username"
								class="mb-1 block font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
								>USERNAME</label
							>
							<input
								id="portfolio-username"
								type="text"
								name="username"
								value={data.portfolioUsername}
								placeholder="your-username"
								class="w-full border-b-2 border-zine-black/20 bg-transparent pb-2 font-body text-sm text-zine-black placeholder-zine-black/25 transition-colors outline-none focus:border-zine-black"
							/>
						</div>
						<label class="mb-5 flex cursor-pointer items-center gap-3 text-sm">
							<input
								type="checkbox"
								name="portfolioPublic"
								checked={data.portfolioPublic}
								class="h-4 w-4 border-2 border-zine-black/30 accent-zine-yellow"
							/>
							<span
								class="font-display text-[10px] font-bold tracking-widest text-zine-black/60 uppercase"
								>MAKE_PORTFOLIO_PUBLIC</span
							>
						</label>
						<button
							type="submit"
							class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
						>
							SAVE PROFILE
						</button>
					</form>
					{#if form?.profileSaved}
						<p
							class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
						>
							✓ PROFILE_SAVED
							{#if data.portfolioPublic && data.portfolioUsername}
								&nbsp;·&nbsp;
								<a
									href={resolve(`/portfolio/${data.portfolioUsername}`)}
									class="text-zine-black/50 underline transition-colors hover:text-zine-black"
									target="_blank">VIEW →</a
								>
							{/if}
						</p>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Notion Automation -->
		<section class="mb-8">
			<h2
				class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				NOTION_AUTOMATION — AI_ANALYSIS
			</h2>
			<div class="border-2 border-zine-black bg-white p-5">
				<p class="mb-5 font-body text-xs leading-relaxed text-zine-black/50">
					Create an automation in Notion on the <strong class="text-zine-black/70"
						>Inspiration Vault</strong
					>
					database:<br />
					<strong class="text-zine-black/70">Trigger:</strong> When a page is added →
					<strong class="text-zine-black/70">Action:</strong> Send HTTP request (POST)
				</p>

				<!-- Webhook URL -->
				<div class="mb-4">
					<p
						class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						WEBHOOK_URL
					</p>
					<div class="flex items-center gap-2 bg-zine-black px-3 py-3">
						<span class="flex-1 font-mono text-xs break-all text-zine-off-white/80 select-all"
							>{webhookUrl}</span
						>
					</div>
				</div>

				<!-- Authorization header -->
				<div class="mb-4">
					<p
						class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						AUTHORIZATION_HEADER
					</p>
					<div class="flex items-center gap-2 bg-zine-black px-3 py-3">
						<span class="flex-1 font-mono text-xs text-zine-off-white/80 select-all"
							>Bearer {data.webhookSecret}</span
						>
						<button
							onclick={() => copyText(`Bearer ${data.webhookSecret}`, 'header')}
							class="shrink-0 px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow/60 uppercase transition-colors hover:text-zine-yellow"
						>
							{copiedHeader ? 'COPIED ✓' : 'COPY'}
						</button>
					</div>
				</div>

				<!-- Request body -->
				<div>
					<p
						class="mb-2 font-display text-[9px] font-bold tracking-[0.2em] text-zine-black/40 uppercase"
					>
						REQUEST_BODY (JSON)
					</p>
					<div class="relative bg-zine-black">
						<pre
							class="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-zine-off-white/80">{data.webhookBody}</pre>
						<button
							onclick={() => copyText(data.webhookBody, 'body')}
							class="absolute top-2 right-2 px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow/60 uppercase transition-colors hover:text-zine-yellow"
						>
							{copiedBody ? 'COPIED ✓' : 'COPY'}
						</button>
					</div>
					<p class="mt-3 font-body text-[10px] text-zine-black/35">
						Note: <code class="font-mono">trigger.page.id</code> is a Notion automation variable — paste
						it literally in the Notion automation editor.
					</p>
				</div>
			</div>
		</section>

		<!-- Danger zone -->
		{#if data.connected}
			<section class="mb-8">
				<h2
					class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-purple/60 uppercase"
				>
					DANGER_ZONE
				</h2>
				<div class="border-2 border-zine-purple/30 bg-white p-5">
					<p class="mb-4 font-body text-xs leading-relaxed text-zine-black/50">
						Disconnecting will revoke access to your Notion workspace. Your data remains in Notion.
					</p>
					<a
						href={resolve('/api/notion/logout')}
						class="inline-block border-2 border-zine-purple/40 px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-purple uppercase transition-colors hover:border-zine-purple hover:bg-zine-purple hover:text-white"
					>
						✕ DISCONNECT NOTION
					</a>
				</div>
			</section>
		{/if}
	</div>
</div>
