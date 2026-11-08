<script lang="ts">
	// A plain stand-in until the designed sign-in screen (design PRD C1, step 1).
	import { page } from '$app/state';

	let email = $state('');
	let sent = $state(false);
	let problem = $state<string | null>(null);
	const next = $derived(page.url.searchParams.get('next') ?? '/');

	async function post(path: string, body: Record<string, unknown>) {
		problem = null;
		const res = await fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const data = await res.json().catch(() => null);
		if (!res.ok) problem = data?.message ?? `Couldn't sign in (${res.status})`;
		return res.ok ? data : null;
	}

	async function google() {
		const data = await post('/api/auth/sign-in/social', { provider: 'google', callbackURL: next });
		if (data?.url) location.href = data.url;
	}

	async function magicLink(e: SubmitEvent) {
		e.preventDefault();
		if (await post('/api/auth/sign-in/magic-link', { email: email.trim(), callbackURL: next })) {
			sent = true;
		}
	}
</script>

<svelte:head><title>Sign in · createthings</title></svelte:head>

<main class="mx-auto flex max-w-sm flex-col gap-4 p-6">
	<h1 class="text-xl font-semibold">Sign in to createthings</h1>
	<button class="rounded-md bg-stone-900 px-4 py-2 text-white" onclick={google}>
		Continue with Google
	</button>
	<p class="text-center text-sm text-stone-500">or get a link by email</p>
	{#if sent}
		<p class="text-sm">Check {email}: the link works for 15 minutes.</p>
	{:else}
		<form class="flex flex-col gap-2" onsubmit={magicLink}>
			<input
				class="rounded-md border border-stone-300 px-3 py-2"
				type="email"
				required
				bind:value={email}
				placeholder="you@example.com"
				autocomplete="email"
			/>
			<button class="rounded-md border border-stone-300 px-4 py-2">Email me a link</button>
		</form>
	{/if}
	{#if problem}<p class="text-sm text-red-700" role="alert">{problem}</p>{/if}
</main>
