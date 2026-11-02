<script lang="ts">
	import { onMount } from 'svelte';
	import {
		api,
		capture,
		DEFAULT_API,
		getSettings,
		isSavableUrl,
		NotConnected,
		saveSettings,
		splitDataUrl
	} from '../lib/api';

	type View = 'loading' | 'connect' | 'capture';

	let view = $state<View>('loading');
	let apiBase = $state(DEFAULT_API);
	let token = $state('');
	let tab = $state<{ id?: number; url?: string; title?: string }>({});
	let note = $state('');
	let want = $state('');
	let asReference = $state(false);
	let busy = $state(false);
	let message = $state<{ ok: boolean; text: string } | null>(null);

	const canSavePage = $derived(isSavableUrl(tab.url));

	onMount(async () => {
		const settings = await getSettings();
		apiBase = settings.apiBase;
		token = settings.token ?? '';
		const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
		tab = { id: active?.id, url: active?.url, title: active?.title };
		view = settings.token ? 'capture' : 'connect';
	});

	async function connect() {
		busy = true;
		message = null;
		await saveSettings({ apiBase: apiBase.trim().replace(/\/$/, ''), token: token.trim() });
		try {
			await api('/api/extension/token');
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
			view = 'capture';
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
		busy = false;
	}

	async function run(done: string, work: () => Promise<unknown>) {
		busy = true;
		message = null;
		try {
			await work();
			message = { ok: true, text: done };
			note = '';
			want = '';
		} catch (e) {
			if (e instanceof NotConnected) view = 'connect';
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
		busy = false;
	}

	const savedText = () => (asReference ? 'Kept as a reference' : 'Saved to your inbox');

	function savePage() {
		return run(savedText(), () =>
			capture({
				captureType: 'url',
				sourceUrl: tab.url!,
				title: tab.title,
				note: note.trim() || undefined,
				asReference
			})
		);
	}

	function saveScreen() {
		return run(savedText(), async () => {
			const shot = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
			if (!shot?.success) throw new Error(shot?.error ?? 'Could not take a screenshot');
			const { mime, base64 } = splitDataUrl(shot.dataUrl);
			return capture({
				captureType: 'screenshot',
				image: base64,
				mime,
				title: tab.title,
				sourceUrl: isSavableUrl(tab.url) ? tab.url : undefined,
				note: note.trim() || undefined,
				asReference
			});
		});
	}

	async function pickArea() {
		if (!tab.id) return;
		try {
			// Pages opened before the extension was installed don't have the picker yet.
			await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['screenshot.js'] });
		} catch {
			// Already there.
		}
		void chrome.tabs.sendMessage(tab.id, { type: 'START_AREA_SELECT' });
		window.close();
	}

	function saveWant() {
		return run('Saved. The pet will help you plan it', () =>
			capture({ captureType: 'note', note: want.trim() })
		);
	}
</script>

<main class="flex w-[360px] flex-col gap-4 bg-stone-50 p-4 text-stone-900">
	<header class="flex items-center justify-between">
		<h1 class="text-base font-semibold">createthings</h1>
		{#if view === 'capture'}
			<button class="text-xs text-stone-500 underline" onclick={() => (view = 'connect')}>
				Connection
			</button>
		{/if}
	</header>

	{#if view === 'loading'}
		<p class="text-sm text-stone-500">Loading…</p>
	{:else if view === 'connect'}
		<section class="flex flex-col gap-3">
			<p class="text-sm text-stone-600">
				Paste the connection token from createthings (Settings → Browser extension).
			</p>
			<label class="flex flex-col gap-1 text-xs font-medium">
				Connection token
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					type="password"
					bind:value={token}
					placeholder="ct_…"
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs font-medium">
				App address
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					bind:value={apiBase}
				/>
			</label>
			<button
				class="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
				disabled={busy || !token.trim()}
				onclick={connect}
			>
				{busy ? 'Connecting…' : 'Connect'}
			</button>
		</section>
	{:else}
		<section class="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
			<p class="truncate text-sm font-medium" title={tab.title}>{tab.title || 'This page'}</p>
			<textarea
				class="min-h-14 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
				bind:value={note}
				placeholder="Add a note (optional)"
			></textarea>
			<label class="flex items-center gap-2 text-xs text-stone-600">
				<input type="checkbox" bind:checked={asReference} />
				Keep as a reference (not something to do)
			</label>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="rounded-md bg-stone-900 px-2 py-2 text-xs font-medium text-white disabled:opacity-50"
					disabled={busy || !canSavePage}
					onclick={savePage}
					title={canSavePage ? 'Save this page' : "This page can't be saved as a link"}
				>
					Save page
				</button>
				<button
					class="rounded-md border border-stone-300 px-2 py-2 text-xs font-medium disabled:opacity-50"
					disabled={busy}
					onclick={saveScreen}
				>
					Screenshot
				</button>
				<button
					class="rounded-md border border-stone-300 px-2 py-2 text-xs font-medium disabled:opacity-50"
					disabled={busy}
					onclick={pickArea}
				>
					Pick area
				</button>
			</div>
		</section>

		<section class="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
			<label class="flex flex-col gap-1 text-xs font-medium">
				I want to…
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					bind:value={want}
					placeholder="learn to make lo-fi beats"
					onkeydown={(e) => e.key === 'Enter' && want.trim() && saveWant()}
				/>
			</label>
			<button
				class="self-end rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
				disabled={busy || !want.trim()}
				onclick={saveWant}
			>
				Save
			</button>
		</section>
	{/if}

	{#if message}
		<p class="text-sm {message.ok ? 'text-green-700' : 'text-red-700'}" role="status">
			{message.text}
		</p>
	{/if}
</main>
