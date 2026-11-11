<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>createthings</title>
</svelte:head>

<div class="min-h-screen">
	{@render children()}
</div>
<Toast />
