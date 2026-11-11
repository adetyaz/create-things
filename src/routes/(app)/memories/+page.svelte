<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { rise, reduced } from '$lib/motion';
	import { shell } from '$lib/shell.svelte';

	/**
	 * What your pet knows: every memory in plain words (05 MEMORY cards, grouped), each deletable
	 * with the 08 honest note, and the proof that it lives on Walrus: the latest blob on Walruscan
	 * and the Walrus Memory account read from Sui through Tatum.
	 * GET /api/memories, GET /api/memories/receipts, DELETE /api/memories/[id], POST /api/memories/forget.
	 */

	type Memory = {
		id: string;
		type: string;
		summary: string;
		status: string;
		blobIds: string[] | null;
		createdAt: string;
	};
	type Group = { label: string; memories: Memory[] };
	type Receipt = {
		account: {
			id: string;
			explorerUrl: string;
			lastChange: { at: string | null; explorerUrl: string } | null;
		};
		yours: {
			sentToWalrus: number;
			latest: { summary: string; blobId: string; walruscanUrl: string } | null;
		};
		checkedAt: string;
	};

	let groups = $state<Group[] | null>(null);
	let receipt = $state<Receipt | null>(null);
	let receiptProblem = $state<string | null>(null);
	let problem = $state<string | null>(null);
	let note = $state<string | null>(null);
	let confirmForget = $state(false);
	let busy = $state(false);
	const reduce = reduced();

	const total = $derived((groups ?? []).reduce((n, g) => n + g.memories.length, 0));
	const name = $derived(shell.pet?.pet.name ?? 'Your pet');
	const date = (at: string) =>
		new Date(at).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=/memories`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			groups = (await api<{ groups: Group[] }>('/api/memories')).groups;
		} catch (e) {
			failed(e);
		}
		api<Receipt>('/api/memories/receipts').then(
			(r) => (receipt = r),
			(e) => (receiptProblem = e instanceof Error ? e.message : 'Could not read the proof.')
		);
	}
	onMount(load);

	async function remove(m: Memory) {
		busy = true;
		try {
			const r = await api<{ note: string }>(`/api/memories/${m.id}`, 'DELETE');
			note = r.note;
			groups = (groups ?? [])
				.map((g) => ({ ...g, memories: g.memories.filter((x) => x.id !== m.id) }))
				.filter((g) => g.memories.length);
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}

	async function forgetAll() {
		busy = true;
		try {
			await api('/api/memories/forget', 'POST', { confirm: true });
			confirmForget = false;
			note = `${name} starts fresh. Walrus can't erase data, so the old copies are never read again and expire on their own.`;
			groups = [];
		} catch (e) {
			failed(e);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>What {name} knows · createthings</title>
</svelte:head>

<main class="page">
	<header class="head">
		<span class="label">{total} {total === 1 ? 'memory' : 'memories'}</span>
		<h1 class="title">What {name} knows.</h1>
		<p class="lead">
			Everything {name} remembers about you, in its own words. It recalls these before every suggestion
			and tells you which ones it used. Delete anything.
		</p>
	</header>

	<!-- Proof: on Walrus, read from Sui through Tatum -->
	<section class="proof" aria-label="Where it's stored">
		<p class="proof-label">STORED ON WALRUS</p>
		{#if receipt}
			<p class="proof-line">
				{receipt.yours.sentToWalrus} of your memories are on Walrus.
				{#if receipt.yours.latest}Latest: “{receipt.yours.latest.summary}”{/if}
			</p>
			<div class="links">
				{#if receipt.yours.latest}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- external proof links -->
					<a href={receipt.yours.latest.walruscanUrl} target="_blank" rel="noopener noreferrer"
						>↗ Latest blob on Walruscan</a
					>
				{/if}
				<a href={receipt.account.explorerUrl} target="_blank" rel="noopener noreferrer"
					>↗ Walrus Memory account on Sui</a
				>
				{#if receipt.account.lastChange}
					<a href={receipt.account.lastChange.explorerUrl} target="_blank" rel="noopener noreferrer"
						>↗ Its last change</a
					>
				{/if}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
			<p class="proof-fine">
				Read from Sui through Tatum · checked {new Date(receipt.checkedAt).toLocaleTimeString(
					undefined,
					{ hour: '2-digit', minute: '2-digit' }
				)}
			</p>
		{:else if receiptProblem}
			<p class="proof-line">{receiptProblem}</p>
		{:else}
			<p class="proof-line">Checking…</p>
		{/if}
	</section>

	<!-- 08 honest note after a delete -->
	{#if note}
		<div class="honest" role="status" in:rise={{ y: 6, duration: 200 }}>
			<span class="i" aria-hidden="true">i</span>
			<p>{note}</p>
			<button class="close" aria-label="Close" onclick={() => (note = null)}>×</button>
		</div>
	{/if}

	{#if problem}
		<div class="state">
			<p>{problem}</p>
			<button class="btn-white" onclick={load}>Try again</button>
		</div>
	{:else if groups === null}
		<div class="skeleton"></div>
		<div class="skeleton"></div>
	{:else if !groups.length}
		<div class="state">
			<p class="empty">Nothing yet.</p>
			<p class="muted">
				{name} starts remembering as you save things, confirm what you want, finish steps and write in
				your journal.
			</p>
		</div>
	{:else}
		{#each groups as g, gi (g.label)}
			<section class="group" in:rise={{ y: 8, delay: reduce ? 0 : Math.min(gi * 60, 300) }}>
				<h2 class="group-label">{g.label}</h2>
				{#each g.memories as m (m.id)}
					<!-- 05 MEMORY -->
					<article class="memory">
						<div class="mem-top">
							<span class="mono">{g.label.toUpperCase()}</span>
							<span class="mono">{date(m.createdAt)}</span>
						</div>
						<p class="quote">“{m.summary}”</p>
						<div class="mem-foot">
							<span class="tag" class:on={m.status === 'sent'}
								>{m.status === 'sent'
									? 'On Walrus'
									: m.status === 'failed'
										? 'Not sent yet'
										: 'Sending…'}</span
							>
							<button class="delete" disabled={busy} onclick={() => remove(m)}>Delete</button>
						</div>
					</article>
				{/each}
			</section>
		{/each}

		<div class="forget">
			{#if confirmForget}
				<p class="muted">{name} forgets everything and starts fresh. This can't be undone.</p>
				<div class="row">
					<button class="btn-white" disabled={busy} onclick={forgetAll}
						>Yes, forget everything</button
					>
					<button class="btn-quiet" onclick={() => (confirmForget = false)}>Keep them</button>
				</div>
			{:else}
				<button class="btn-quiet" onclick={() => (confirmForget = true)}>Forget everything</button>
			{/if}
		</div>
	{/if}
</main>

<style>
	.page {
		max-width: 720px;
		width: calc(100% - 32px);
		margin: 24px auto 48px;
		padding: 28px clamp(16px, 4vw, 40px) 40px;
		border-radius: 24px;
		background-color: #f6f4ef;
		background-image: radial-gradient(#ddd8cd 1px, transparent 1px);
		background-size: 22px 22px;
		box-shadow:
			inset 0 0 0 1px #e4e0d7,
			var(--dusty-edge, 0 0 0 transparent),
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
		display: flex;
		flex-direction: column;
		gap: 20px;
		color: #1b1a17;
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 12px;
		color: #5f5a52;
	}
	.title {
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 44px;
		line-height: 1;
	}
	.lead {
		font-size: 14px;
		line-height: 1.55;
		color: #57534b;
		max-width: 36rem;
	}
	.proof {
		padding: 16px 18px;
		border-radius: 16px;
		background: #fff;
		display: flex;
		flex-direction: column;
		gap: 8px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.proof-label {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.proof-line {
		font-size: 14px;
		line-height: 1.5;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.links a {
		height: 28px;
		padding: 0 12px;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px #e4e0d7;
		font-size: 12px;
		display: inline-flex;
		align-items: center;
	}
	.proof-fine {
		font-size: 11px;
		color: #5f5a52;
	}
	.honest {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr) 24px;
		gap: 10px;
		align-items: start;
		padding: 14px 16px;
		border-radius: 16px;
		background: #efece5;
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.i {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-style: italic;
	}
	.close {
		color: #57534b;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.group-label {
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-weight: 400;
		font-size: 28px;
		color: #6b665e;
	}
	.memory {
		background: #fff;
		border-radius: 16px;
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.mem-top,
	.mem-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.quote {
		font-family: 'Instrument Serif', serif;
		font-size: 22px;
		line-height: 1.25;
	}
	.tag {
		font-size: 11px;
		color: #5f5a52;
	}
	.tag.on {
		color: oklch(0.45 0.12 145);
	}
	.delete {
		font-size: 12px;
		color: #57534b;
		padding: 4px 8px;
		border-radius: 999px;
	}
	.delete:hover {
		background: #efece5;
		color: #1b1a17;
	}
	.forget {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
		padding-top: 8px;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
	}
	.state {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.empty {
		font-family: 'Instrument Serif', serif;
		font-size: 28px;
	}
	.btn-white,
	.btn-quiet {
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-white {
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.btn-quiet {
		color: #57534b;
	}
	.btn-white:active,
	.btn-quiet:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.5;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	.skeleton {
		height: 90px;
		border-radius: 16px;
		background: #efece5;
	}
</style>
