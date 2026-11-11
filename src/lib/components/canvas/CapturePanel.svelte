<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { reduced, rise } from '$lib/motion';

	/**
	 * What the capture "+" opens when the bar is empty: the other ways to add something, like the
	 * extension popup's list (design 11). Grows out of the capture pill; closes the same way.
	 */

	type Idea = { title: string; text: string };
	type Saved = {
		id: string;
		title: string;
		sourceUrl: string | null;
		note: string | null;
		captureType: string;
		status: string;
		intent: string;
		analysisError: string | null;
	};

	let {
		startVoice: voiceFirst = false,
		onimage,
		onwant,
		onsaved,
		onclose
	}: {
		/** Open straight into recording (the mic button). */
		startVoice?: boolean;
		onimage: () => void;
		onwant: () => void;
		onsaved: (items: Saved[]) => void;
		onclose: () => void;
	} = $props();

	const VOICE_COST = 2;
	const MAX_SECONDS = 180;

	let mode = $state<'menu' | 'recording' | 'listening' | 'ideas'>('menu');
	let seconds = $state(0);
	let problem = $state<string | null>(null);
	let transcript = $state('');
	let ideas = $state<(Idea & { keep: boolean })[]>([]);
	let saving = $state(false);

	let recorder: MediaRecorder | null = null;
	let stream: MediaStream | null = null;
	let chunks: Blob[] = [];
	let timer: ReturnType<typeof setInterval> | null = null;
	let cancelled = false;

	const chosen = $derived(ideas.filter((i) => i.keep));

	async function startVoice() {
		problem = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			problem = 'Your browser blocked the microphone. Allow it for this site and try again.';
			return;
		}
		chunks = [];
		cancelled = false;
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
		recorder.onstop = () => {
			stopStream();
			if (!cancelled) send();
		};
		recorder.start();
		seconds = 0;
		mode = 'recording';
		timer = setInterval(() => {
			seconds += 1;
			if (seconds >= MAX_SECONDS) stopVoice();
		}, 1000);
	}

	function stopStream() {
		if (timer) clearInterval(timer);
		timer = null;
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	function stopVoice() {
		if (recorder?.state === 'recording') recorder.stop();
	}
	function cancelVoice() {
		cancelled = true;
		stopVoice();
		mode = 'menu';
	}

	async function send() {
		mode = 'listening';
		const type = (recorder?.mimeType || 'audio/webm').split(';')[0];
		const blob = new Blob(chunks, { type });
		const audio = await new Promise<string>((done) => {
			const r = new FileReader();
			r.onload = () => done(String(r.result).split(',')[1] ?? '');
			r.readAsDataURL(blob);
		});
		try {
			const res = await api<
				| { status: 'split'; transcript: string; ideas: Idea[] }
				| { status: 'empty'; transcript: string }
			>('/api/voice', 'POST', { audio, mime: type });
			transcript = res.transcript;
			if (res.status === 'empty') {
				problem = "I heard you, but couldn't find an idea in it. Try saying what you want to do.";
				mode = 'menu';
				return;
			}
			ideas = res.ideas.map((i) => ({ ...i, keep: true }));
			mode = 'ideas';
		} catch (e) {
			problem =
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Talking it out needs ${e.cost ?? VOICE_COST} credits, and today's free ones are used up. They come back tomorrow.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.';
			mode = 'menu';
		}
	}

	async function saveIdeas() {
		if (!chosen.length || saving) return;
		saving = true;
		try {
			const saved: Saved[] = [];
			for (const idea of chosen) {
				const { item } = await api<{ item: Saved }>('/api/items', 'POST', {
					captureType: 'note',
					title: idea.title.slice(0, 200),
					note: idea.text
				});
				saved.push(item);
			}
			onsaved(saved);
			onclose();
		} catch (e) {
			problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		if (voiceFirst) startVoice();
	});

	onDestroy(() => {
		cancelled = true;
		if (recorder?.state === 'recording') recorder.stop();
		stopStream();
	});

	const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	const reduce = reduced();
</script>

<div
	class="panel"
	role="dialog"
	aria-label="Add something"
	in:rise={{ y: -6, scale: 0.96, duration: 200 }}
	out:rise={{ y: -6, scale: 0.96, duration: 140 }}
>
	{#if mode === 'menu'}
		<button class="row" onclick={onwant}>
			<span class="glyph" aria-hidden="true">✎</span>
			<span class="row-text"
				><span class="row-title">I want to…</span><span class="row-sub"
					>Write the thing you keep meaning to do</span
				></span
			>
		</button>
		<button class="row" onclick={onimage}>
			<span class="glyph" aria-hidden="true">
				<svg viewBox="0 0 20 20" width="16" height="16"
					><path
						d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9Z M3.5 13l3.6-3.6a1.2 1.2 0 0 1 1.7 0L14 14.5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						stroke-linecap="round"
					/></svg
				>
			</span>
			<span class="row-text"
				><span class="row-title">Add an image</span><span class="row-sub"
					>Or paste or drop one anywhere</span
				></span
			>
		</button>
		<button class="row" onclick={startVoice}>
			<span class="glyph" aria-hidden="true">
				<svg viewBox="0 0 20 20" width="16" height="16"
					><path
						d="M10 3a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 10 3Z M5 9.5a5 5 0 0 0 10 0 M10 14.5V17"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						stroke-linecap="round"
					/></svg
				>
			</span>
			<span class="row-text"
				><span class="row-title">Talk it out</span><span class="row-sub"
					>Ramble; your pet splits it into ideas</span
				></span
			>
			<span class="cost">{VOICE_COST} cr</span>
		</button>
		<a class="row" href={resolve('/courses/new')}>
			<span class="glyph" aria-hidden="true">≡</span>
			<span class="row-text"
				><span class="row-title">Add a course</span><span class="row-sub"
					>Upload the syllabus; the plan follows its units</span
				></span
			>
			<span class="cost">3 cr</span>
		</a>
		<p class="hint">Paste a link into the bar to save the page.</p>
	{:else if mode === 'recording'}
		<div class="voice" in:rise={{ y: 4, duration: 200 }}>
			<span class="rec" aria-hidden="true"></span>
			<span class="voice-text"
				><span class="row-title">Listening</span><span class="mono" aria-live="off"
					>{clock(seconds)} / {clock(MAX_SECONDS)}</span
				></span
			>
			<button class="btn-quiet" onclick={cancelVoice}>Cancel</button>
			<button class="btn-ink" onclick={stopVoice}>Done · {VOICE_COST} cr</button>
		</div>
	{:else if mode === 'listening'}
		<div class="voice" in:rise={{ y: 4, duration: 200 }} aria-live="polite">
			<span class="spin" aria-hidden="true"></span>
			<span class="row-title">Splitting it into ideas…</span>
		</div>
	{:else}
		<div class="ideas" in:rise={{ y: 4, duration: 200 }}>
			<p class="row-sub">Keep the ones you want. Each is saved as a note.</p>
			<ul>
				{#each ideas as idea, i (i)}
					<li in:rise={{ y: 6, duration: 200, delay: reduce ? 0 : Math.min(i * 40, 240) }}>
						<label class="idea" class:off={!idea.keep}>
							<input type="checkbox" bind:checked={idea.keep} />
							<span class="row-text"
								><span class="row-title">{idea.title}</span><span class="row-sub">{idea.text}</span
								></span
							>
						</label>
					</li>
				{/each}
			</ul>
			{#if transcript}
				<details class="transcript">
					<summary>What I heard</summary>
					<p>{transcript}</p>
				</details>
			{/if}
			<div class="actions">
				<button class="btn-quiet" onclick={() => (mode = 'menu')}>Back</button>
				<button class="btn-ink" disabled={!chosen.length || saving} onclick={saveIdeas}
					>{saving ? 'Saving…' : `Save ${chosen.length}`}</button
				>
			</div>
		</div>
	{/if}
	{#if problem}
		<p class="problem" role="alert" transition:slide={{ duration: reduce ? 0 : 160 }}>{problem}</p>
	{/if}
</div>

<style>
	/* A white floating card, like the 16A rail. Grows from the capture pill above it. */
	.panel {
		position: fixed;
		z-index: 25;
		top: calc(var(--strip-h, 0px) + 68px);
		left: 50%;
		translate: -50% 0;
		width: min(380px, calc(100% - 32px));
		transform-origin: top center;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px;
		background: #fff;
		border-radius: 20px;
		box-shadow:
			0 0 0 1px #e4e0d7,
			0 8px 24px rgba(27, 26, 23, 0.06);
		font-size: 13px;
		color: #1b1a17;
		will-change: transform, opacity;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 9px 10px;
		border-radius: 12px;
		text-align: left;
		transition:
			background-color var(--dur-press) var(--ease-out),
			transform var(--dur-press) var(--ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.row:hover {
			background: #efece5;
		}
	}
	.row:active {
		transform: scale(0.98);
		background: #efece5;
	}
	.glyph {
		width: 30px;
		height: 30px;
		flex: none;
		border-radius: 50%;
		background: #f6f4ef;
		box-shadow: 0 0 0 1px #e4e0d7;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #57534b;
		font-size: 14px;
	}
	.row-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}
	.row-title {
		font-size: 13px;
		font-weight: 600;
	}
	.row-sub {
		font-size: 12px;
		line-height: 1.4;
		color: #5f5a52;
	}
	.cost {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.hint {
		padding: 6px 10px 2px;
		font-size: 11px;
		color: #5f5a52;
	}

	.voice {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 6px 8px 10px;
	}
	.voice-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	/* Recording: the seal-red dot breathes (opacity and scale only). */
	.rec {
		width: 12px;
		height: 12px;
		flex: none;
		border-radius: 50%;
		background: oklch(0.6 0.15 35);
		animation: breathe 1.2s var(--ease-out) infinite;
	}
	@keyframes breathe {
		50% {
			transform: scale(0.7);
			opacity: 0.55;
		}
	}
	.spin {
		width: 14px;
		height: 14px;
		flex: none;
		border-radius: 50%;
		border: 1.5px solid #e4e0d7;
		border-top-color: #1b1a17;
		animation: turn 0.8s linear infinite;
	}
	@keyframes turn {
		to {
			transform: rotate(1turn);
		}
	}

	.ideas {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 6px;
	}
	.ideas ul {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 46svh;
		overflow-y: auto;
	}
	.idea {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 8px;
		border-radius: 12px;
		cursor: pointer;
		transition: opacity var(--dur-press) var(--ease-out);
	}
	.idea.off {
		opacity: 0.5;
	}
	.idea input {
		margin-top: 2px;
		accent-color: #1b1a17;
	}
	.transcript {
		font-size: 12px;
		color: #5f5a52;
	}
	.transcript summary {
		cursor: pointer;
	}
	.transcript p {
		margin-top: 6px;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.problem {
		margin: 6px 6px 2px;
		font-size: 12px;
		line-height: 1.45;
		color: #57534b;
	}

	/* 04 buttons, small. */
	.btn-ink,
	.btn-quiet {
		height: 32px;
		padding: 0 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		transition: transform var(--dur-press) var(--ease-out);
	}
	.btn-ink {
		background: #1b1a17;
		color: #fff;
	}
	.btn-quiet {
		color: #57534b;
	}
	.btn-ink:active,
	.btn-quiet:active {
		transform: scale(0.96);
	}
	button:disabled {
		opacity: 0.45;
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	@media (max-width: 720px) {
		.panel {
			top: calc(var(--strip-h, 0px) + 64px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.rec,
		.spin {
			animation: none;
		}
		.row:active,
		.btn-ink:active,
		.btn-quiet:active {
			transform: none;
		}
	}
</style>
