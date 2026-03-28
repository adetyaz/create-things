<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/', label: 'ARCHIVE' },
		{ href: '/publish', label: 'NETWORK' },
		{ href: '/settings', label: 'CONFIG' }
	];

	let isPortfolio = $derived(page.url.pathname.startsWith('/portfolio'));

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>createthings</title>
</svelte:head>

<div class="min-h-screen text-zine-black">
	{#if !isPortfolio && data.connected}
		<nav class="border-b-2 border-zine-black bg-zine-black">
			<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
				<a href={resolve('/')} class="leading-none">
					<Logo size="md" bg="#FFE600" color="#0D0D0D" />
				</a>
				<div class="flex items-center gap-8">
					{#each navItems as item (item.href)}
						<a
							href={resolve(item.href as '/' | '/publish' | '/settings')}
							class="font-display text-xs font-bold tracking-widest uppercase transition-colors
								{isActive(item.href)
								? 'border-b-2 border-zine-yellow pb-0.5 text-zine-yellow'
								: 'text-white/50 hover:text-white'}"
						>
							{item.label}
						</a>
					{/each}
				</div>
				<a
					href={resolve('/api/notion/logout')}
					class="font-display text-xs font-bold tracking-widest text-white/30 uppercase transition-colors hover:text-white/60"
				>
					LOGOUT
				</a>
			</div>
		</nav>
	{/if}
	{@render children()}
</div>
<Toast />
