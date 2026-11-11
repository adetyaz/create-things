<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	/** Sign in or sign up with Google (one button: a first sign-in makes the account). */
	const next = $derived(page.url.searchParams.get('next') ?? '/today');
	let busy = $state(false);
	let problem = $state<string | null>(null);

	async function google() {
		busy = true;
		problem = null;
		try {
			const res = await fetch('/api/auth/sign-in/social', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ provider: 'google', callbackURL: next })
			});
			const data = await res.json().catch(() => null);
			if (res.ok && data?.url) location.href = data.url;
			else problem = data?.message ?? `Couldn't reach Google (${res.status}). Try again.`;
		} catch {
			problem = "Can't reach createthings. Check your connection and try again.";
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Sign in · createthings</title></svelte:head>

<main class="page">
	<div class="card">
		<a href={resolve('/')} class="brand"><span class="seal">ct</span>createthings</a>
		<h1 class="title">Start with your pet.</h1>
		<p class="lead">
			Sign in to keep your pet, your saves and your plans in your own account. New here? The same
			button makes your account.
		</p>
		<button class="google" disabled={busy} onclick={google}>
			<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
				<path
					fill="#4285F4"
					d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
				/>
				<path
					fill="#34A853"
					d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
				/>
				<path
					fill="#FBBC05"
					d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
				/>
				<path
					fill="#EA4335"
					d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
				/>
			</svg>
			{busy ? 'Opening Google…' : 'Continue with Google'}
		</button>
		{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
		<p class="fine">
			By continuing you agree to how we handle your data: <a href={resolve('/privacy')}>privacy</a>.
		</p>
	</div>
</main>

<style>
	.page {
		min-height: 100svh;
		display: grid;
		place-items: center;
		padding: 24px 16px;
		background-color: #f6f4ef;
		background-image: radial-gradient(#ddd8cd 1px, transparent 1px);
		background-size: 22px 22px;
		color: #1b1a17;
		font-family: 'Geist', sans-serif;
	}
	.card {
		width: min(400px, 100%);
		background: #fff;
		border-radius: 24px;
		padding: 32px 28px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.12);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
	}
	.seal {
		width: 24px;
		height: 24px;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 14px;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
	}
	.title {
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 40px;
		line-height: 1.05;
		letter-spacing: -0.01em;
	}
	.lead {
		font-size: 14px;
		line-height: 1.55;
		color: #57534b;
	}
	.google {
		height: 44px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 15px;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.google svg {
		background: #fff;
		border-radius: 50%;
		padding: 2px;
		box-sizing: content-box;
	}
	.google:active {
		scale: 0.96;
	}
	.google:disabled {
		opacity: 0.6;
	}
	.google:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 3px;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
	.fine {
		font-size: 12px;
		color: #5f5a52;
	}
	.fine a {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
