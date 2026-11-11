<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { rise } from '$lib/motion';
	import { shell, refreshShell, PET_STATE } from '$lib/shell.svelte';

	/**
	 * Talk to the pet (07): one speech bubble at a time, its tail pointing at the pet; what the reply
	 * relied on shows as "Based on" citations (08). Modes: chat, I'm stuck, Teach me (about a step).
	 * Every message shows its cost before you send it. POST /api/chat.
	 */

	type Mode = 'chat' | 'stuck' | 'teach';
	type Message = { role: 'user' | 'pet'; text: string };
	type Reply = { reply: string; memoriesUsed: { text: string }[]; saved: string | null };

	const COST = 1;
	const MODES: { id: Mode; label: string; hint: string }[] = [
		{ id: 'chat', label: 'Talk', hint: 'Anything on your mind' },
		{ id: 'stuck', label: "I'm stuck", hint: 'A break first, then a smaller step or a new angle' },
		{ id: 'teach', label: 'Teach me', hint: 'A short lesson on this' }
	];

	let mode = $state<Mode>('chat');
	let itemId = $state<string | undefined>(undefined);
	let stepId = $state<string | undefined>(undefined);
	let about = $state<string | null>(null);
	let messages = $state<Message[]>([]);
	let latest = $state<Reply | null>(null);
	let text = $state('');
	let busy = $state(false);
	let problem = $state<string | null>(null);
	let input = $state<HTMLTextAreaElement>();

	const name = $derived(shell.pet?.pet.name ?? 'Your pet');
	const petState = $derived(shell.pet ? (PET_STATE[shell.pet.mood] ?? 'happy') : 'egg');

	onMount(() => {
		const q = page.url.searchParams;
		const m = q.get('mode');
		if (m === 'stuck' || m === 'teach') mode = m;
		itemId = q.get('itemId') ?? undefined;
		stepId = q.get('stepId') ?? undefined;
		about = q.get('about');
		if (about && mode === 'stuck') text = `I'm stuck on "${about}".`;
		if (about && mode === 'teach') text = `Teach me what I need for "${about}".`;
		input?.focus();
	});

	async function send() {
		const words = text.trim();
		if (!words || busy) return;
		busy = true;
		problem = null;
		const next: Message[] = [...messages, { role: 'user' as const, text: words }].slice(-12);
		try {
			const r = await api<Reply>('/api/chat', 'POST', { mode, itemId, stepId, messages: next });
			messages = [...next, { role: 'pet' as const, text: r.reply }].slice(-12);
			latest = r;
			text = '';
			void refreshShell();
		} catch (e) {
			if (e instanceof ApiError && e.needsSignIn) {
				window.location.assign(`${resolve('/signin')}?next=/talk`);
				return;
			}
			problem =
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Each message needs ${e.cost ?? COST} credit, and today's free ones are used up.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Talk to {name} · createthings</title>
</svelte:head>

<main class="page">
	<div class="modes" role="tablist" aria-label="What kind of help">
		{#each MODES as m (m.id)}
			<button
				role="tab"
				aria-selected={mode === m.id}
				class:on={mode === m.id}
				onclick={() => (mode = m.id)}>{m.label}</button
			>
		{/each}
	</div>
	<p class="hint">
		{MODES.find((m) => m.id === mode)?.hint}{about ? ` · about “${about}”` : ''}
	</p>

	<!-- The pet and its one bubble (07) -->
	<section class="stage" aria-live="polite">
		<div
			class="pet"
			data-ct
			data-species={shell.pet?.pet.species ?? 'dog'}
			data-state={petState}
			data-action={busy ? 'sniff' : 'idle'}
		>
			{#if shell.loaded}<ct-kawaii class="fill"></ct-kawaii>{/if}
		</div>
		{#key latest?.reply ?? (busy ? 'busy' : 'hello')}
			<div class="bubble" in:rise={{ y: 6, scale: 0.98, duration: 220 }}>
				{#if busy}
					<span class="thinking">Thinking…</span>
				{:else if latest}
					{latest.reply}
				{:else}
					Hi. What's going on? Ask me anything about what you're making or learning.
				{/if}
			</div>
		{/key}
	</section>

	<!-- 08 citations: what the reply relied on -->
	{#if latest?.memoriesUsed.length}
		<div class="cites">
			<span class="mono">BASED ON</span>
			{#each latest.memoriesUsed.slice(0, 4) as m, i (i)}<span class="chip">{m.text}</span>{/each}
		</div>
	{/if}
	{#if latest?.saved}<p class="saved">{name} will remember: {latest.saved}</p>{/if}

	{#if messages.length > 2}
		<details class="history">
			<summary>Earlier in this conversation</summary>
			{#each messages.slice(0, -1) as m, i (i)}
				<p class:you={m.role === 'user'}><b>{m.role === 'user' ? 'You' : name}:</b> {m.text}</p>
			{/each}
		</details>
	{/if}

	<!-- 04 input -->
	<div class="compose">
		<label class="sr-only" for="say">Say something to {name}</label>
		<textarea
			id="say"
			bind:this={input}
			bind:value={text}
			rows="2"
			maxlength="2000"
			placeholder="Say something…"
			onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
		></textarea>
		<button class="send" disabled={busy || !text.trim()} onclick={send}>Send · {COST} cr</button>
	</div>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</main>

<style>
	.page {
		max-width: 640px;
		width: calc(100% - 32px);
		margin: 24px auto 48px;
		padding: 24px clamp(16px, 4vw, 36px) 32px;
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
		gap: 14px;
		color: #1b1a17;
	}
	.modes {
		align-self: flex-start;
		display: flex;
		gap: 2px;
		padding: 3px;
		background: #fff;
		border-radius: 999px;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
	}
	.modes button {
		padding: 6px 12px;
		border-radius: 999px;
		color: #57534b;
	}
	.modes button.on {
		background: #1b1a17;
		color: #fff;
		font-weight: 500;
	}
	.hint {
		font-size: 12px;
		color: #5f5a52;
	}
	.stage {
		position: relative;
		display: grid;
		grid-template-columns: 140px minmax(0, 1fr);
		align-items: end;
		gap: 8px;
		min-height: 180px;
	}
	.pet {
		position: relative;
		width: 140px;
		height: 160px;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	/* 07: one bubble, tail toward the pet (bottom-left corner). */
	.bubble {
		align-self: center;
		padding: 14px 16px;
		border-radius: 18px;
		border-bottom-left-radius: 5px;
		background: #fff;
		font-size: 15px;
		line-height: 1.5;
		white-space: pre-wrap;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 12px 32px rgba(27, 26, 23, 0.08);
	}
	.thinking {
		color: #5f5a52;
	}
	.cites {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.chip {
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 12px;
		background: #efece5;
		color: #57534b;
	}
	.saved {
		font-size: 12px;
		color: oklch(0.4 0.1 145);
	}
	.history {
		font-size: 13px;
		color: #57534b;
	}
	.history summary {
		cursor: pointer;
	}
	.history p {
		margin-top: 6px;
		line-height: 1.5;
	}
	.compose {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 8px 8px 8px 14px;
		background: #fff;
		border-radius: 20px;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.compose:focus-within {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	textarea {
		flex: 1;
		min-width: 0;
		resize: none;
		background: transparent;
		outline: none;
		font: inherit;
		font-size: 15px;
		line-height: 1.5;
		padding: 6px 0;
	}
	.send {
		flex: none;
		height: 36px;
		padding: 0 16px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.send:active {
		scale: 0.96;
	}
	.send:disabled {
		opacity: 0.45;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	@media (max-width: 520px) {
		.stage {
			grid-template-columns: 96px minmax(0, 1fr);
		}
		.pet {
			width: 96px;
			height: 110px;
		}
	}
</style>
