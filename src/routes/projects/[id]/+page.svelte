<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	interface EditorBlock {
		id: string;
		type: string;
		content: string;
	}

	let { data, form } = $props();

	// Meta state — writable derived (resets from data on reload, user overrides locally)
	let title = $derived(data.project.title);
	let status = $derived(data.project.status);
	let remixTag = $derived(data.project.remixTag || '');
	let isPublic = $derived(data.project.isPublic);
	let savingMeta = $state(false);
	let savedMeta = $state(false);

	// Block editor state — writable derived
	let blocks: EditorBlock[] = $derived(
		data.blocks.length > 0
			? data.blocks.map((b: EditorBlock) => ({ ...b }))
			: [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }]
	);
	let savingContent = $state(false);
	let savedContent = $state(false);
	let blocksJson = $derived(JSON.stringify(blocks));

	// Publish state
	const PLATFORMS = ['Twitter', 'LinkedIn', 'Instagram', 'Reddit'];
	let selectedPlatforms = $state(['Twitter', 'LinkedIn']);
	let publishing = $state(false);
	let publishError = $state('');
	let publishedEntryId = $state('');

	async function prepareForPublish() {
		publishing = true;
		publishError = '';
		publishedEntryId = '';
		try {
			const res = await fetch('/api/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: 'prepare',
					projectId: data.project.id,
					platforms: selectedPlatforms
				})
			});
			if (!res.ok) {
				const err = await res.text();
				throw new Error(err);
			}
			const json = await res.json();
			publishedEntryId = json.entryId;
		} catch (e) {
			publishError = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			publishing = false;
		}
	}

	function blockTextClass(type: string): string {
		switch (type) {
			case 'heading_2':
				return 'text-lg font-semibold text-gray-900';
			case 'heading_3':
				return 'text-base font-medium text-gray-800';
			default:
				return 'text-sm text-gray-700 leading-relaxed';
		}
	}

	function blockPlaceholder(type: string): string {
		switch (type) {
			case 'heading_2':
				return 'Heading';
			case 'heading_3':
				return 'Subheading';
			case 'bulleted_list_item':
				return 'List item';
			default:
				return 'Start writing...';
		}
	}

	function addBlock(type: string, afterIndex?: number) {
		const newBlock: EditorBlock = { id: crypto.randomUUID(), type, content: '' };
		if (afterIndex !== undefined && afterIndex < blocks.length) {
			blocks.splice(afterIndex + 1, 0, newBlock);
		} else {
			blocks.push(newBlock);
		}
		// Focus new block
		const idx = afterIndex !== undefined ? afterIndex + 1 : blocks.length - 1;
		setTimeout(() => {
			const el = document.querySelector(
				`[data-block-index="${idx}"] textarea, [data-block-index="${idx}"] input`
			) as HTMLElement;
			el?.focus();
		}, 50);
	}

	function removeBlock(index: number) {
		blocks.splice(index, 1);
		if (blocks.length === 0) {
			blocks.push({ id: crypto.randomUUID(), type: 'paragraph', content: '' });
		}
	}

	function moveBlock(index: number, dir: -1 | 1) {
		const target = index + dir;
		if (target < 0 || target >= blocks.length) return;
		const temp = blocks[index];
		blocks[index] = blocks[target];
		blocks[target] = temp;
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter' && !e.shiftKey && blocks[index].type !== 'bulleted_list_item') {
			e.preventDefault();
			addBlock('paragraph', index);
		}
		if (
			e.key === 'Enter' &&
			!e.shiftKey &&
			blocks[index].type === 'bulleted_list_item' &&
			blocks[index].content === ''
		) {
			e.preventDefault();
			// Empty list item → convert to paragraph
			blocks[index].type = 'paragraph';
		}
	}

	function autoResize(node: HTMLTextAreaElement) {
		function resize() {
			node.style.height = 'auto';
			node.style.height = node.scrollHeight + 'px';
		}
		node.addEventListener('input', resize);
		resize();
		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}

	function youtubeEmbed(url: string): string | null {
		const m =
			url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) || null;
		return m ? `https://www.youtube.com/embed/${m[1]}` : null;
	}
</script>

<div class="mx-auto max-w-3xl px-6 py-8">
	<!-- Back nav -->
	<a
		href={resolve('/')}
		class="mb-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
	>
		&#8592; Back to Vault
	</a>

	<!-- ───── Project Details ───── -->
	<form
		method="POST"
		action="?/updateMeta"
		use:enhance={() => {
			savingMeta = true;
			savedMeta = false;
			return async ({ update }) => {
				await update();
				savingMeta = false;
				savedMeta = true;
				setTimeout(() => (savedMeta = false), 2000);
			};
		}}
	>
		<div class="mb-8">
			<input
				name="title"
				bind:value={title}
				class="w-full border-0 bg-transparent px-0 text-2xl font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none"
				placeholder="Project title"
			/>

			<div class="mt-4 flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<label for="project-status" class="text-xs text-gray-400">Status</label>
					<select
						id="project-status"
						name="status"
						bind:value={status}
						class="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
					>
						<option value="Ideating">Ideating</option>
						<option value="In Progress">In Progress</option>
						<option value="Done">Done</option>
					</select>
				</div>

				<div class="flex items-center gap-2">
					<label for="project-remix" class="text-xs text-gray-400">Remix</label>
					<select
						id="project-remix"
						name="remixTag"
						bind:value={remixTag}
						class="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-teal-500 focus:outline-none"
					>
						<option value="">None</option>
						<option value="Inspired by">Inspired by</option>
						<option value="Remixed from">Remixed from</option>
						<option value="Recreated">Recreated</option>
					</select>
				</div>

				<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						name="public"
						bind:checked={isPublic}
						class="h-4 w-4 rounded border-gray-300 accent-teal-600"
					/>
					Public
				</label>
			</div>

			<div class="mt-3 flex items-center gap-3 text-xs text-gray-400">
				{#if data.project.dateStarted}
					<span>Started {new Date(data.project.dateStarted).toLocaleDateString()}</span>
				{/if}
				{#if data.project.dateCompleted}
					<span>&middot; Completed {new Date(data.project.dateCompleted).toLocaleDateString()}</span
					>
				{/if}
			</div>

			<div class="mt-4 flex items-center gap-3">
				<button
					type="submit"
					disabled={savingMeta}
					class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
				>
					{savingMeta ? 'Saving...' : 'Save Details'}
				</button>
				{#if savedMeta || form?.metaSaved}
					<span class="text-xs text-teal-600">Saved &#10003;</span>
				{/if}
			</div>
		</div>
	</form>

	<!-- ───── Linked Inspirations ───── -->
	{#if data.inspirations.length}
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Inspirations</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.inspirations as insp (insp.id)}
					<a
						href={resolve('/inspiration/[id]', { id: insp.id })}
						class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-teal-300 hover:text-teal-700"
					>
						{insp.title}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ───── Content Editor ───── -->
	<section>
		<h2 class="mb-4 text-xs font-medium tracking-wide text-gray-400 uppercase">Content</h2>

		<form
			method="POST"
			action="?/saveContent"
			use:enhance={() => {
				savingContent = true;
				savedContent = false;
				return async ({ update }) => {
					await update();
					savingContent = false;
					savedContent = true;
					setTimeout(() => (savedContent = false), 3000);
				};
			}}
		>
			<input type="hidden" name="blocks" value={blocksJson} />

			<div class="space-y-1 rounded-lg border border-gray-200 bg-white p-4">
				{#each blocks as block, i (block.id)}
					<div class="group relative flex gap-1" data-block-index={i}>
						<!-- Left controls -->
						<div
							class="flex flex-col gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<button
								type="button"
								onclick={() => moveBlock(i, -1)}
								class="rounded p-0.5 text-xs text-gray-300 hover:bg-gray-100 hover:text-gray-500"
								title="Move up">&#8593;</button
							>
							<button
								type="button"
								onclick={() => moveBlock(i, 1)}
								class="rounded p-0.5 text-xs text-gray-300 hover:bg-gray-100 hover:text-gray-500"
								title="Move down">&#8595;</button
							>
						</div>

						<!-- Block content -->
						<div class="min-w-0 flex-1">
							{#if block.type === 'divider'}
								<div class="flex items-center py-3">
									<hr class="flex-1 border-gray-200" />
								</div>
							{:else if block.type === 'image'}
								<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
									{#if block.content}
										<img
											src={block.content}
											alt=""
											class="mb-2 max-h-64 w-full rounded-md object-contain"
										/>
									{/if}
									<input
										type="url"
										bind:value={block.content}
										class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-teal-500 focus:outline-none"
										placeholder="Paste image URL (https://...)"
									/>
								</div>
							{:else if block.type === 'video'}
								<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
									{#if block.content && youtubeEmbed(block.content)}
										<iframe
											src={youtubeEmbed(block.content)}
											title="Video"
											class="mb-2 aspect-video w-full rounded-md"
											frameborder="0"
											allowfullscreen
										></iframe>
									{:else if block.content}
										<p class="mb-2 text-xs text-gray-400">Video will be embedded when viewed</p>
									{/if}
									<input
										type="url"
										bind:value={block.content}
										class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:border-teal-500 focus:outline-none"
										placeholder="Paste video URL (YouTube, Vimeo...)"
									/>
								</div>
							{:else}
								<!-- Text blocks -->
								<div class="flex items-start gap-1">
									<select
										bind:value={block.type}
										class="mt-0.5 shrink-0 rounded border-0 bg-transparent px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-100 focus:outline-none"
									>
										<option value="paragraph">&#182;</option>
										<option value="heading_2">H2</option>
										<option value="heading_3">H3</option>
										<option value="bulleted_list_item">&bull;</option>
									</select>
									<textarea
										use:autoResize
										bind:value={block.content}
										onkeydown={(e) => handleKeydown(e, i)}
										class="w-full resize-none border-0 bg-transparent px-1 py-1 focus:outline-none {blockTextClass(
											block.type
										)}"
										rows={1}
										placeholder={blockPlaceholder(block.type)}
									></textarea>
								</div>
							{/if}
						</div>

						<!-- Delete button -->
						<button
							type="button"
							onclick={() => removeBlock(i)}
							class="mt-1 shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
							title="Delete block">&times;</button
						>
					</div>
				{/each}
			</div>

			<!-- Add block toolbar -->
			<div class="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
				<button
					type="button"
					onclick={() => addBlock('paragraph')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Text
				</button>
				<button
					type="button"
					onclick={() => addBlock('heading_2')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Heading
				</button>
				<button
					type="button"
					onclick={() => addBlock('heading_3')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Subheading
				</button>
				<button
					type="button"
					onclick={() => addBlock('bulleted_list_item')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ List
				</button>
				<button
					type="button"
					onclick={() => addBlock('image')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Image
				</button>
				<button
					type="button"
					onclick={() => addBlock('video')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Video
				</button>
				<button
					type="button"
					onclick={() => addBlock('divider')}
					class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
				>
					+ Divider
				</button>
			</div>

			<!-- Save content -->
			<div class="mt-6 flex items-center gap-3">
				<button
					type="submit"
					disabled={savingContent}
					class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
				>
					{savingContent ? 'Saving...' : 'Save Content'}
				</button>
				{#if savedContent || form?.contentSaved}
					<span class="text-xs text-teal-600">Content saved &#10003;</span>
				{/if}
			</div>
		</form>
	</section>

	<!-- ───── Prepare for Publish ───── -->
	<section class="mt-10 border-t border-gray-100 pt-8">
		<h2 class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">Publish</h2>
		<p class="mb-4 text-xs text-gray-400">
			Generate captions and add this project to the publish queue.
		</p>

		<div class="mb-4 flex flex-wrap gap-3">
			{#each PLATFORMS as platform (platform)}
				<label class="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={selectedPlatforms.includes(platform)}
						onchange={() => {
							if (selectedPlatforms.includes(platform)) {
								selectedPlatforms = selectedPlatforms.filter((p) => p !== platform);
							} else {
								selectedPlatforms = [...selectedPlatforms, platform];
							}
						}}
						class="h-4 w-4 rounded border-gray-300 accent-teal-600"
					/>
					{platform}
				</label>
			{/each}
		</div>

		{#if publishedEntryId}
			<p class="mb-3 text-sm text-teal-600">
				&#10003; Captions generated and added to the publish queue.
			</p>
			<a
				href={resolve('/publish')}
				class="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
			>
				Go to Publish Queue &#8594;
			</a>
		{:else}
			<button
				type="button"
				disabled={publishing || selectedPlatforms.length === 0}
				onclick={prepareForPublish}
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
			>
				{publishing ? 'Generating captions...' : 'Prepare for Publish'}
			</button>
		{/if}

		{#if publishError}
			<p class="mt-2 text-xs text-red-500">{publishError}</p>
		{/if}
	</section>
</div>
