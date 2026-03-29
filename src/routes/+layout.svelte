<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ProfessionModal from '$lib/components/ProfessionModal.svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/', label: 'ARCHIVE' },
		{ href: '/projects', label: 'PROJECTS' },
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
			<div class="mx-auto max-w-7xl px-4 sm:px-6">
				<!-- Single row: Logo | [desktop nav] | Logout -->
				<div class="flex items-center justify-between py-3">
					<a href={resolve('/')} class="leading-none">
						<Logo size="md" bg="#FFE600" color="#0D0D0D" />
					</a>
					<div class="hidden items-center gap-8 sm:flex">
						{#each navItems as item (item.href)}
							<a
								href={resolve(item.href as '/' | '/projects' | '/publish' | '/settings')}
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
				<!-- Mobile-only nav row -->
				<div class="flex items-center justify-around border-t border-white/10 pt-2 pb-2 sm:hidden">
					{#each navItems as item (item.href)}
						<a
							href={resolve(item.href as '/' | '/projects' | '/publish' | '/settings')}
							class="font-display text-[9px] font-bold tracking-[0.15em] uppercase transition-colors
								{isActive(item.href)
								? 'border-b-2 border-zine-yellow pb-0.5 text-zine-yellow'
								: 'text-white/50 hover:text-white'}"
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
<Toast />
{#if data.connected}
	<ProfessionModal />
{/if}
