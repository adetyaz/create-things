<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
	<div class="text-6xl font-bold text-gray-200">{page.status}</div>
	<h1 class="text-xl font-medium text-gray-700">{page.error?.message || 'Something went wrong'}</h1>
	<a
		href={resolve('/')}
		class="mt-4 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
	>
		Back to Dashboard
	</a>
</div>
