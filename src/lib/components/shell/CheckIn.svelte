<script lang="ts">
	import { api } from '$lib/api';
	import { rise } from '$lib/motion';
	import { feedMoment } from '$lib/shell.svelte';

	/**
	 * Design 04 check-in input ("did 5 minutes on the chords · Check in"). Saves a one-line
	 * journal entry; when it feeds the pet, the 07 feed toast shows ("+ meal for Biscuit").
	 */
	let { autofocus = false, ondone }: { autofocus?: boolean; ondone?: () => void } = $props();

	type Fed = { status: 'fed' | 'full'; name?: string; size?: string } | null;

	let body = $state('');
	let busy = $state(false);
	let result = $state<{ fed: boolean; text: string } | null>(null);
	let input = $state<HTMLInputElement>();

	$effect(() => {
		if (autofocus) input?.focus();
	});

	async function send() {
		const text = body.trim();
		if (!text || busy) return;
		busy = true;
		try {
			const r = await api<{ fed: Fed; about: { title: string } | null }>('/api/journal', 'POST', {
				kind: 'check_in',
				body: text
			});
			body = '';
			if (r.fed?.status === 'fed') {
				result = { fed: true, text: `+ ${r.fed.size ?? 'snack'} for ${r.fed.name ?? 'your pet'}` };
				feedMoment();
			} else if (r.fed?.status === 'full') {
				result = {
					fed: false,
					text: `${r.fed.name ?? 'Your pet'} is full for today. Saved to your journal.`
				};
			} else {
				result = {
					fed: false,
					text: r.about
						? `Saved to your journal, about "${r.about.title}".`
						: 'Saved to your journal. Only work on a Focus item feeds the pet.'
				};
			}
			setTimeout(() => ondone?.(), 1800);
		} catch (e) {
			result = {
				fed: false,
				text: e instanceof Error ? e.message : 'Something went wrong. Try again.'
			};
		} finally {
			busy = false;
		}
	}
</script>

<div class="wrap">
	<div class="field">
		<label class="sr-only" for="checkin">What did you do?</label>
		<input
			id="checkin"
			bind:this={input}
			bind:value={body}
			placeholder="did 5 minutes on the chords"
			maxlength="2000"
			onkeydown={(e) => e.key === 'Enter' && send()}
		/>
		<button class="go" disabled={busy || !body.trim()} onclick={send}>Check in</button>
	</div>
	{#if result}
		<div class="toast" class:fed={result.fed} in:rise={{ y: 6, duration: 200 }} role="status">
			{result.text}
		</div>
	{/if}
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 44px;
		padding: 0 6px 0 16px;
		background: #efece5;
		border-radius: 14px;
	}
	.field:focus-within {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	input {
		flex: 1;
		min-width: 0;
		background: transparent;
		outline: none;
		font-size: 14px;
		color: #1b1a17;
	}
	input::placeholder {
		color: #5f5a52;
	}
	.go {
		height: 28px;
		padding: 0 12px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 12px;
		font-weight: 500;
		flex: none;
		transition: transform var(--dur-press) var(--ease-out);
	}
	.go:active {
		transform: scale(0.96);
	}
	.go:disabled {
		opacity: 0.45;
	}
	/* 07 feed toast. */
	.toast {
		padding: 10px 14px;
		border-radius: 14px;
		font-size: 13px;
		color: #57534b;
		background: #efece5;
	}
	.toast.fed {
		font-weight: 600;
		color: oklch(0.38 0.1 145);
		background: oklch(0.95 0.03 145);
	}
</style>
