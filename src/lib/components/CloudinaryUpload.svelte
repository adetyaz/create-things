<script lang="ts">
	import { PUBLIC_UPLOADCARE_PUBLIC_KEY, PUBLIC_UPLOADCARE_CDN_BASE } from '$env/static/public';

	interface Props {
		type: 'image' | 'video';
		onUploaded: (url: string) => void;
	}

	let { type, onUploaded }: Props = $props();

	let uploading = $state(false);
	let progress = $state(0);
	let error = $state('');
	let dragging = $state(false);

	const accept = $derived(type === 'image' ? 'image/*' : 'video/*');

	async function upload(file: File) {
		if (!PUBLIC_UPLOADCARE_PUBLIC_KEY) {
			error = 'Uploadcare not configured — add PUBLIC_UPLOADCARE_PUBLIC_KEY to .env';
			return;
		}

		uploading = true;
		progress = 0;
		error = '';

		const formData = new FormData();
		formData.append('UPLOADCARE_PUB_KEY', PUBLIC_UPLOADCARE_PUBLIC_KEY);
		formData.append('UPLOADCARE_STORE', 'auto');
		formData.append('file', file);

		try {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://upload.uploadcare.com/base/');

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					progress = Math.round((e.loaded / e.total) * 100);
				}
			};

			await new Promise<void>((resolve, reject) => {
				xhr.onload = () => {
					if (xhr.status === 200) {
						const result = JSON.parse(xhr.responseText);
						const uuid = result.file;
						const cdnBase = PUBLIC_UPLOADCARE_CDN_BASE.replace(/\/$/, '');
						onUploaded(`${cdnBase}/${uuid}/`);
						resolve();
					} else {
						reject(new Error(`Upload failed: ${xhr.statusText}`));
					}
				};
				xhr.onerror = () => reject(new Error('Network error during upload'));
				xhr.send(formData);
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
			progress = 0;
		}
	}

	function onFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) upload(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) upload(file);
	}
</script>

{#if uploading}
	<div
		class="flex h-24 flex-col items-center justify-center gap-2 border-2 border-dashed border-zine-black/15 bg-zine-off-white"
	>
		<div class="h-1 w-48 overflow-hidden bg-zine-black/10">
			<div
				class="h-full bg-zine-black transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
		<p class="font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase">
			UPLOADING {progress}%
		</p>
	</div>
{:else}
	<label
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
		class="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed py-6 transition-colors
			{dragging
			? 'border-zine-black bg-zine-black/5'
			: 'border-zine-black/15 bg-zine-off-white hover:border-zine-black/30'}"
	>
		<span class="font-display text-xl font-bold text-zine-black/20">
			{type === 'image' ? '⌁' : '▷'}
		</span>
		<span class="font-display text-[9px] font-bold tracking-widest text-zine-black/30 uppercase">
			DROP {type.toUpperCase()} OR CLICK TO SELECT
		</span>
		<input type="file" {accept} onchange={onFileChange} class="hidden" />
	</label>
{/if}

{#if error}
	<p class="mt-1 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
		{error}
	</p>
{/if}
