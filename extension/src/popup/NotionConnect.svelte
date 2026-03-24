<script lang="ts">
	const API_BASE = 'http://localhost:5173';

	function connectNotion() {
		// Opens the OAuth flow in a new tab — the callback redirects back
		chrome.tabs.create({ url: `${API_BASE}/api/notion/authorize` });
		window.close();
	}
</script>

<div class="flex flex-col items-center gap-6 p-6 text-center">
	<div class="text-2xl font-medium text-teal-600">[ create things ]</div>
	<p class="text-sm text-gray-500">Connect your Notion workspace to get started</p>

	<div class="flex w-full flex-col gap-3">
		<button
			onclick={connectNotion}
			class="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
		>
			Connect Notion workspace
		</button>

		<a
			href="https://www.notion.so/desktop"
			target="_blank"
			rel="noopener noreferrer"
			class="text-xs text-gray-400 underline transition-colors hover:text-gray-600"
		>
			Don't have Notion? Download it here
		</a>
	</div>
</div>
