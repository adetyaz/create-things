<script lang="ts">
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CloudinaryUpload from '$lib/components/CloudinaryUpload.svelte';

	interface EditorBlock {
		id: string;
		type: string;
		content: string;
	}

	let { data, form } = $props();

	// Meta state
	let title = $state(untrack(() => data.project.title));
	let status = $state(untrack(() => data.project.status));
	let remixTag = $state(untrack(() => data.project.remixTag || ''));
	let isPublic = $state(untrack(() => data.project.isPublic));
	let savingMeta = $state(false);
	let savedMeta = $state(false);

	// Block editor state
	let blocks = $state<EditorBlock[]>(
		untrack(() =>
			data.blocks.length > 0
				? data.blocks.map((b: EditorBlock) => ({ ...b }))
				: [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }]
		)
	);
	let savingContent = $state(false);
	let savedContent = $state(false);
	let blocksJson = $derived(JSON.stringify(blocks));

	// Sidebar inspiration expand state
	let expandedInsps = $state<string[]>([]);
	function toggleInsp(id: string) {
		if (expandedInsps.includes(id)) {
			expandedInsps = expandedInsps.filter((x) => x !== id);
		} else {
			expandedInsps = [...expandedInsps, id];
		}
	}

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
				return 'font-display font-bold text-2xl uppercase tracking-tight text-zine-black leading-tight';
			case 'heading_3':
				return 'font-display font-bold text-lg uppercase tracking-tight text-zine-black/80 leading-snug';
			case 'bulleted_list_item':
				return 'font-body text-base text-zine-black/75 leading-relaxed';
			default:
				return 'font-body text-base text-zine-black/75 leading-relaxed';
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

	function blockTopSpacing(type: string): string {
		switch (type) {
			case 'heading_2':
				return 'mt-8 first:mt-0';
			case 'heading_3':
				return 'mt-6 first:mt-0';
			default:
				return 'mt-2 first:mt-0';
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

	function setBlockContent(index: number, content: string) {
		blocks[index] = { ...blocks[index], content };
	}

	function youtubeEmbed(url: string): string | null {
		const m =
			url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) || null;
		return m ? `https://www.youtube.com/embed/${m[1]}` : null;
	}
</script>

<div class="min-h-screen bg-zine-off-white xl:flex xl:items-stretch">
	<!-- ── Left: Editor ── -->
	<div class="min-w-0 flex-1">
		<div class="mx-auto max-w-3xl px-6 py-10">
			<!-- Back nav -->
			<a
				href={resolve('/')}
				class="mb-8 inline-flex items-center gap-2 font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase transition-colors hover:text-zine-black"
			>
				&#8592; BACK TO VAULT
			</a>

			<!-- ───── Project Details ───── -->
			<form
				method="POST"
				action="?/updateMeta"
				use:enhance={() => {
					savingMeta = true;
					savedMeta = false;
					return async ({ update }) => {
						await update({ reset: false });
						savingMeta = false;
						savedMeta = true;
						setTimeout(() => (savedMeta = false), 2000);
					};
				}}
			>
				<div class="mb-10 border-b-2 border-zine-black pb-8">
					<p
						class="mb-2 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
					>
						PROJECT_EDITOR
					</p>
					<input
						name="title"
						bind:value={title}
						class="mb-6 w-full bg-transparent font-display text-2xl font-bold text-zine-black uppercase outline-none placeholder:text-zine-black/20"
						placeholder="PROJECT TITLE"
					/>

					<div class="mb-5 flex flex-wrap items-center gap-5">
						<div class="flex items-center gap-2">
							<label
								for="project-status"
								class="font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase"
								>STATUS</label
							>
							<select
								id="project-status"
								name="status"
								bind:value={status}
								class="border-2 border-zine-black/20 bg-transparent px-2 py-1.5 font-display text-[10px] font-bold tracking-widest text-zine-black uppercase transition-colors outline-none focus:border-zine-black"
							>
								<option value="Ideating">IDEATING</option>
								<option value="In Progress">IN_PROGRESS</option>
								<option value="Done">DONE</option>
							</select>
						</div>

						<div class="flex items-center gap-2">
							<label
								for="project-remix"
								class="font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase"
								>REMIX</label
							>
							<select
								id="project-remix"
								name="remixTag"
								bind:value={remixTag}
								class="border-2 border-zine-black/20 bg-transparent px-2 py-1.5 font-display text-[10px] font-bold tracking-widest text-zine-black uppercase transition-colors outline-none focus:border-zine-black"
							>
								<option value="">NONE</option>
								<option value="Inspired by">INSPIRED_BY</option>
								<option value="Remixed from">REMIXED_FROM</option>
								<option value="Recreated">RECREATED</option>
							</select>
						</div>

						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								name="public"
								bind:checked={isPublic}
								class="h-4 w-4 border-2 border-zine-black/30 accent-zine-yellow"
							/>
							<span
								class="font-display text-[9px] font-bold tracking-widest text-zine-black/50 uppercase"
								>PUBLIC</span
							>
						</label>
					</div>

					<div
						class="mb-5 flex items-center gap-3 font-display text-[8px] font-bold tracking-widest text-zine-black/25 uppercase"
					>
						{#if data.project.dateStarted}
							<span>STARTED {new Date(data.project.dateStarted).toLocaleDateString()}</span>
						{/if}
						{#if data.project.dateCompleted}
							<span>· COMPLETED {new Date(data.project.dateCompleted).toLocaleDateString()}</span>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<button
							type="submit"
							disabled={savingMeta}
							class="bg-zine-black px-4 py-2 font-display text-[10px] font-bold tracking-widest text-white uppercase transition-colors hover:bg-zine-black/80 disabled:opacity-40"
						>
							{savingMeta ? 'SAVING...' : 'SAVE DETAILS'}
						</button>
						{#if savedMeta || form?.metaSaved}
							<span
								class="font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
								>✓ SAVED</span
							>
						{/if}
					</div>
				</div>
			</form>

			<!-- ───── Linked Inspirations ───── -->
			{#if data.inspirations.length}
				<section class="mb-8">
					<h2
						class="mb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
					>
						LINKED_INSPIRATIONS
					</h2>
					<div class="flex flex-wrap gap-2">
						{#each data.inspirations as insp (insp.id)}
							<a
								href={resolve('/inspiration/[id]', { id: insp.id })}
								class="border-2 border-zine-black/20 bg-white px-3 py-2 font-display text-[10px] font-bold tracking-widest text-zine-black/60 uppercase transition-colors hover:border-zine-black hover:text-zine-black"
							>
								{insp.title}
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- ───── Content Editor ───── -->
			<section class="mb-10">
				<h2
					class="mb-4 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					CONTENT_EDITOR
				</h2>

				<form
					method="POST"
					action="?/saveContent"
					use:enhance={() => {
						savingContent = true;
						savedContent = false;
						return async ({ update }) => {
							await update({ reset: false, invalidateAll: false });
							savingContent = false;
							savedContent = true;
							setTimeout(() => (savedContent = false), 3000);
						};
					}}
				>
					<input type="hidden" name="blocks" value={blocksJson} />

					<div class="space-y-0">
						{#each blocks as block, i (block.id)}
							<div
								class="group relative flex gap-2 {blockTopSpacing(block.type)}"
								data-block-index={i}
							>
								<!-- Left hover controls -->
								<div
									class="flex shrink-0 flex-col items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<select
										bind:value={block.type}
										class="mb-0.5 w-28 cursor-pointer border border-zine-black/15 bg-zine-off-white px-2 py-1 font-display text-[9px] font-bold text-zine-black/60 uppercase outline-none hover:border-zine-black hover:text-zine-black"
										title="Change block type"
									>
										<option value="paragraph">¶ Paragraph</option>
										<option value="heading_2">H1 Big Heading</option>
										<option value="heading_3">H2 Subheading</option>
										<option value="bulleted_list_item">• Bullet Point</option>
										<option value="image">⌁ Image</option>
										<option value="video">▷ Video</option>
										<option value="divider">— Divider</option>
									</select>
									<button
										type="button"
										onclick={() => moveBlock(i, -1)}
										class="rounded p-0.5 font-display text-[9px] font-bold text-zine-black/20 hover:bg-zine-black/5 hover:text-zine-black/50"
										title="Move up">↑</button
									>
									<button
										type="button"
										onclick={() => moveBlock(i, 1)}
										class="rounded p-0.5 font-display text-[9px] font-bold text-zine-black/20 hover:bg-zine-black/5 hover:text-zine-black/50"
										title="Move down">↓</button
									>
								</div>

								<!-- Block content -->
								<div class="min-w-0 flex-1">
									{#if block.type === 'divider'}
										<div class="flex items-center py-4">
											<hr class="flex-1 border-t-2 border-zine-black/10" />
										</div>
									{:else if block.type === 'image'}
										<div class="my-2">
											{#if blocks[i].content}
												<img
													src={blocks[i].content}
													alt=""
													class="mb-3 block w-full"
													style="max-height: 480px; object-fit: contain;"
												/>
												<div
													class="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100"
												>
													<button
														type="button"
														onclick={() => setBlockContent(i, '')}
														class="shrink-0 bg-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow uppercase"
														>REPLACE</button
													>
													<input
														type="url"
														value={blocks[i].content}
														oninput={(e) =>
															setBlockContent(i, (e.target as HTMLInputElement).value)}
														class="w-full border-b border-zine-black/15 bg-transparent pb-1 font-body text-xs text-zine-black/40 outline-none placeholder:text-zine-black/20 focus:border-zine-black/40"
														placeholder="Or paste URL directly"
													/>
												</div>
											{:else}
												<CloudinaryUpload
													type="image"
													onUploaded={(url) => setBlockContent(i, url)}
												/>
												<div class="mt-2 flex items-center gap-2">
													<span
														class="shrink-0 font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase"
														>or URL:</span
													>
													<input
														type="url"
														value={blocks[i].content}
														oninput={(e) =>
															setBlockContent(i, (e.target as HTMLInputElement).value)}
														class="w-full border-b border-zine-black/15 bg-transparent pb-1 font-body text-xs text-zine-black/40 outline-none placeholder:text-zine-black/20 focus:border-zine-black/40"
														placeholder="Paste image URL (https://...)"
													/>
												</div>
											{/if}
										</div>
									{:else if block.type === 'video'}
										<div class="my-2">
											{#if blocks[i].content && youtubeEmbed(blocks[i].content)}
												<iframe
													src={youtubeEmbed(blocks[i].content)}
													title="Video"
													class="mb-2 aspect-video w-full"
													frameborder="0"
													allowfullscreen
												></iframe>
												<div
													class="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100"
												>
													<button
														type="button"
														onclick={() => setBlockContent(i, '')}
														class="shrink-0 bg-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow uppercase"
														>REPLACE</button
													>
													<input
														type="url"
														value={blocks[i].content}
														oninput={(e) =>
															setBlockContent(i, (e.target as HTMLInputElement).value)}
														class="w-full border-b border-zine-black/15 bg-transparent pb-1 font-body text-xs text-zine-black/40 outline-none placeholder:text-zine-black/20 focus:border-zine-black/40"
														placeholder="Or paste URL directly"
													/>
												</div>
											{:else if blocks[i].content}
												<video
													src={blocks[i].content}
													controls
													class="mb-2 aspect-video w-full bg-zine-black"
												>
													<track kind="captions" />
												</video>
												<div
													class="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100"
												>
													<button
														type="button"
														onclick={() => setBlockContent(i, '')}
														class="shrink-0 bg-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow uppercase"
														>REPLACE</button
													>
													<input
														type="url"
														value={blocks[i].content}
														oninput={(e) =>
															setBlockContent(i, (e.target as HTMLInputElement).value)}
														class="w-full border-b border-zine-black/15 bg-transparent pb-1 font-body text-xs text-zine-black/40 outline-none placeholder:text-zine-black/20 focus:border-zine-black/40"
														placeholder="Or paste URL directly"
													/>
												</div>
											{:else}
												<CloudinaryUpload
													type="video"
													onUploaded={(url) => setBlockContent(i, url)}
												/>
												<div class="mt-2 flex items-center gap-2">
													<span
														class="shrink-0 font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase"
														>or URL:</span
													>
													<input
														type="url"
														value={blocks[i].content}
														oninput={(e) =>
															setBlockContent(i, (e.target as HTMLInputElement).value)}
														class="w-full border-b border-zine-black/15 bg-transparent pb-1 font-body text-xs text-zine-black/40 outline-none placeholder:text-zine-black/20 focus:border-zine-black/40"
														placeholder="Paste video URL (YouTube, Vimeo...)"
													/>
												</div>
											{/if}
										</div>
									{:else if block.type === 'bulleted_list_item'}
										<div class="flex items-start gap-3">
											<span class="mt-[0.35em] shrink-0 text-zine-black/40">·</span>
											<textarea
												use:autoResize
												bind:value={block.content}
												onkeydown={(e) => handleKeydown(e, i)}
												class="w-full resize-none border-0 bg-transparent py-0 outline-none {blockTextClass(
													block.type
												)}"
												rows={1}
												placeholder={blockPlaceholder(block.type)}
											></textarea>
										</div>
									{:else}
										<textarea
											use:autoResize
											bind:value={block.content}
											onkeydown={(e) => handleKeydown(e, i)}
											class="w-full resize-none border-0 bg-transparent py-0 outline-none {blockTextClass(
												block.type
											)}"
											rows={1}
											placeholder={blockPlaceholder(block.type)}
										></textarea>
									{/if}
								</div>

								<!-- Delete button -->
								<button
									type="button"
									onclick={() => removeBlock(i)}
									class="mt-1 shrink-0 rounded p-1 font-display text-[10px] font-bold text-zine-black/20 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
									title="Delete block">&times;</button
								>
							</div>
						{/each}
					</div>

					<!-- Add block toolbar -->
					<div class="mt-8 flex flex-wrap gap-2 border-t-2 border-zine-black/10 pt-4">
						{#each [['paragraph', '+ TEXT'], ['heading_2', '+ HEADING'], ['heading_3', '+ SUBHEADING'], ['bulleted_list_item', '+ LIST'], ['image', '+ IMAGE'], ['video', '+ VIDEO'], ['divider', '+ DIVIDER']] as [blockType, label] (blockType)}
							<button
								type="button"
								onclick={() => addBlock(blockType)}
								class="border border-zine-black/15 px-3 py-1.5 font-display text-[8px] font-bold tracking-widest text-zine-black/35 uppercase transition-colors hover:border-zine-black/35 hover:text-zine-black/60"
							>
								{label}
							</button>
						{/each}
					</div>

					<!-- Save content -->
					<div class="mt-5 flex items-center gap-3">
						<button
							type="submit"
							disabled={savingContent}
							class="bg-zine-black px-5 py-3 font-display text-xs font-bold tracking-widest text-white uppercase transition-colors hover:bg-zine-black/80 disabled:opacity-40"
						>
							{savingContent ? 'SAVING...' : 'SAVE CONTENT'}
						</button>
						{#if savedContent || form?.contentSaved}
							<span
								class="font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
								>✓ SAVED</span
							>
						{/if}
					</div>
				</form>
			</section>

			<!-- ───── Prepare for Publish ───── -->
			<section class="border-t-2 border-zine-black pt-8">
				<h2
					class="mb-1 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
				>
					PUBLISH_QUEUE
				</h2>
				<p class="mb-5 font-body text-xs text-zine-black/40">
					Generate captions and add this project to the publish queue.
				</p>

				<div class="mb-5 flex flex-wrap gap-4">
					{#each PLATFORMS as platform (platform)}
						<label class="flex cursor-pointer items-center gap-2">
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
								class="h-4 w-4 border-2 border-zine-black/30 accent-zine-yellow"
							/>
							<span
								class="font-display text-[9px] font-bold tracking-widest text-zine-black/60 uppercase"
								>{platform}</span
							>
						</label>
					{/each}
				</div>

				{#if publishedEntryId}
					<p
						class="mb-4 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
					>
						✓ CAPTIONS_GENERATED — ADDED TO QUEUE
					</p>
					<a
						href={resolve('/publish')}
						class="inline-block border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
					>
						→ GO TO PUBLISH QUEUE
					</a>
				{:else}
					<button
						type="button"
						disabled={publishing || selectedPlatforms.length === 0}
						onclick={prepareForPublish}
						class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
					>
						{publishing ? 'GENERATING...' : '→ PREPARE FOR PUBLISH'}
					</button>
				{/if}

				{#if publishError}
					<p class="mt-3 font-display text-[9px] font-bold tracking-widest text-red-500 uppercase">
						{publishError}
					</p>
				{/if}
			</section>
		</div>
	</div>
	<!-- /left -->

	<!-- ── Right: REFERENCED panel ── -->
	<aside
		class="border-t-2 border-zine-black bg-zine-black xl:sticky xl:top-0 xl:max-h-screen xl:w-72 xl:shrink-0 xl:overflow-y-auto xl:border-t-0 xl:border-l-2"
	>
		<div class="p-5">
			<p
				class="mb-4 border-b border-white/10 pb-3 font-display text-[9px] font-bold tracking-[0.3em] text-zine-yellow/60 uppercase"
			>
				REFERENCED
			</p>

			{#if data.inspirations.length}
				<div class="space-y-2">
					{#each data.inspirations as insp (insp.id)}
						<div
							class="border-2 transition-colors {expandedInsps.includes(insp.id)
								? 'border-zine-yellow/40 bg-white/8'
								: 'border-white/10 bg-white/5 hover:border-white/20'}"
						>
							<button
								type="button"
								onclick={() => toggleInsp(insp.id)}
								class="group w-full p-3 text-left"
							>
								<div
									class="mb-1 font-display text-[9px] font-bold tracking-widest text-zine-yellow/40 uppercase"
								>
									SOURCE_REF
								</div>
								<p
									class="line-clamp-2 font-display text-xs leading-snug font-bold tracking-wide text-white/70 uppercase group-hover:text-white"
								>
									{insp.title}
								</p>
								<div
									class="mt-2 font-display text-[9px] font-bold tracking-widest text-white/20 uppercase group-hover:text-zine-yellow/60"
								>
									{expandedInsps.includes(insp.id) ? 'COLLAPSE ↑' : 'EXPAND ↓'}
								</div>
							</button>
							{#if expandedInsps.includes(insp.id)}
								<div transition:slide={{ duration: 200 }} class="border-t border-white/10 p-3">
									{#if insp.imageUrl}
										<img
											src={insp.imageUrl}
											alt={insp.title}
											class="mb-3 block w-full border border-white/10"
										/>
									{/if}
									{#if insp.sourceUrl}
										<a
											href={insp.sourceUrl}
											target="_blank"
											rel="external noopener noreferrer"
											class="mb-3 block font-body text-[10px] leading-relaxed break-all text-white/40 underline hover:text-white/70"
										>
											{insp.sourceUrl}
										</a>
									{/if}
									<a
										href={resolve('/inspiration/[id]', { id: insp.id })}
										class="font-display text-[9px] font-bold tracking-widest text-zine-yellow/60 uppercase hover:text-zine-yellow"
									>
										OPEN FULL →
									</a>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="font-body text-xs text-white/25">
					No linked inspirations. Open an inspiration and use "Start Project" to link it here.
				</p>
			{/if}
		</div>
	</aside>
</div>
