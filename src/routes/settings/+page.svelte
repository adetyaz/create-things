<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let figmaKey = $derived(data.figmaFileKey);
	let threshold = $derived(data.staleThreshold);
	let copiedHeader = $state(false);
	let copiedBody = $state(false);

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

<div class="mx-auto max-w-2xl px-6 py-8">
	<!-- Back nav -->
	<a
		href={resolve('/')}
		class="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
	>
		&#8592; Back to Vault
	</a>

	<h1 class="mb-8 text-xl font-medium text-gray-900">Settings</h1>

	<!-- Notion connection -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
			Notion Connection
		</h2>
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			<div class="flex items-center gap-3">
				<div class="h-2.5 w-2.5 rounded-full {data.connected ? 'bg-teal-500' : 'bg-red-400'}"></div>
				<span class="text-sm text-gray-700">
					{data.connected ? 'Connected to Notion' : 'Not connected'}
				</span>
			</div>
			{#if !data.connected}
				<a
					href={resolve('/api/notion/authorize')}
					class="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
				>
					Connect Notion
				</a>
			{/if}
		</div>
	</section>

	<!-- Figma connection -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Figma Export</h2>
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			<div class="mb-3 flex items-center gap-3">
				<div
					class="h-2.5 w-2.5 rounded-full {data.figmaConnected ? 'bg-teal-500' : 'bg-gray-300'}"
				></div>
				<span class="text-sm text-gray-700">
					{data.figmaConnected ? 'Figma connected' : 'Not connected'}
				</span>
			</div>

			<form method="POST" action="?/figma" use:enhance>
				<label for="figma-key" class="mb-1 block text-xs text-gray-500">
					Figma File Key
					<span class="text-gray-300"
						>(from the URL: figma.com/file/<strong>FILE_KEY</strong>/...)</span
					>
				</label>
				<div class="flex gap-2">
					<input
						id="figma-key"
						type="text"
						name="fileKey"
						bind:value={figmaKey}
						placeholder="Enter your Figma file key"
						class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
					/>
					<button
						type="submit"
						class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
					>
						Save
					</button>
				</div>
			</form>

			{#if form?.figmaSaved}
				<p class="mt-2 text-xs text-teal-600">Figma file key saved!</p>
			{/if}
		</div>
	</section>

	<!-- Stale threshold -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Stale Threshold</h2>
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			<form method="POST" action="?/stale" use:enhance>
				<label for="stale-threshold" class="mb-1 block text-xs text-gray-500">
					Days before an inspiration is marked stale
				</label>
				<div class="flex items-center gap-3">
					<input
						id="stale-threshold"
						type="number"
						name="threshold"
						bind:value={threshold}
						min="1"
						max="365"
						class="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
					/>
					<span class="text-xs text-gray-400">days</span>
					<button
						type="submit"
						class="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
					>
						Update
					</button>
				</div>
			</form>

			{#if form?.staleSaved}
				<p class="mt-2 text-xs text-teal-600">Stale threshold updated!</p>
			{/if}
		</div>
	</section>

	<!-- Connected platforms -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
			Publishing Platforms
		</h2>
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			{#if data.platforms.length}
				<div class="flex flex-wrap gap-2">
					{#each data.platforms as platform (platform)}
						<span class="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
							{platform}
						</span>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-gray-400">
					No platforms connected yet. Connect Buffer to start publishing.
				</p>
			{/if}
		</div>
	</section>

	<!-- Notion Automation (Phase 3 — item 22) -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
			Notion Automation — AI Analysis
		</h2>
		<div class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
			<p class="mb-4 text-xs text-gray-500">
				Create an automation in Notion on the <strong>Inspiration Vault</strong> database:
				<br /><strong>Trigger:</strong> When a page is added &rarr;
				<strong>Action:</strong> Send HTTP request (POST)
			</p>

			<!-- Webhook URL -->
			<div class="mb-4">
				<p class="mb-1 text-xs font-medium text-gray-500">Webhook URL</p>
				<div class="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs">
					<span class="flex-1 break-all select-all">{webhookUrl}</span>
				</div>
			</div>

			<!-- Authorization header -->
			<div class="mb-4">
				<p class="mb-1 text-xs font-medium text-gray-500">Authorization header</p>
				<div class="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs">
					<span class="flex-1 select-all">Bearer {data.webhookSecret}</span>
					<button
						onclick={() => copyText(`Bearer ${data.webhookSecret}`, 'header')}
						class="shrink-0 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
					>
						{copiedHeader ? 'Copied!' : 'Copy'}
					</button>
				</div>
			</div>

			<!-- Request body -->
			<div>
				<p class="mb-1 text-xs font-medium text-gray-500">Request body (JSON)</p>
				<div class="relative rounded-md bg-gray-50">
					<pre
						class="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-gray-700">{data.webhookBody}</pre>
					<button
						onclick={() => copyText(data.webhookBody, 'body')}
						class="absolute top-2 right-2 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
					>
						{copiedBody ? 'Copied!' : 'Copy'}
					</button>
				</div>
				<p class="mt-2 text-xs text-gray-400">
					Note: <code>trigger.page.id</code> is a Notion automation variable — paste it literally in the
					Notion automation editor.
				</p>
			</div>
		</div>
	</section>
</div>
