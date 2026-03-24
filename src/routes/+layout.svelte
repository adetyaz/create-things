<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/publish', label: 'Publish' },
		{ href: '/settings', label: 'Settings' }
	];

	let isPortfolio = $derived(page.url.pathname.startsWith('/portfolio'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>createthings</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900">
	{#if !isPortfolio}
		<nav class="border-b border-gray-200 bg-white">
			<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
				<a href={resolve('/')} class="text-lg font-medium">
					<span class="text-gray-600">create</span><span class="text-gray-900">things</span>
				</a>
				<div class="flex items-center gap-4">
					{#each navItems as item (item.href)}
						<a
							href={resolve(item.href as '/' | '/publish' | '/settings')}
							class="text-sm transition-colors {page.url.pathname === item.href
								? 'font-medium text-teal-600'
								: 'text-gray-500 hover:text-gray-700'}"
						>
							{item.label}
						</a>
					{/each}
				</div>
			</div>
		</nav>
	{/if}
	{@render children()}
</div>
