<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let copiedId = $state<string | null>(null);

	function shareUrl(platform: string, text: string, title: string, hashtags: string): string {
		const body = hashtags ? `${text}\n\n${hashtags}` : text;
		const t = encodeURIComponent(body);
		const ti = encodeURIComponent(title);
		switch (platform) {
			case 'twitter':
				return `https://twitter.com/intent/tweet?text=${t}`;
			case 'linkedin':
				return `https://www.linkedin.com/shareArticle?mini=true&title=${ti}&summary=${t}`;
			case 'reddit':
				return `https://www.reddit.com/submit?title=${ti}&text=${t}`;
			default:
				return '#';
		}
	}

	async function copyCaption(text: string, id: string) {
		await navigator.clipboard.writeText(text);
		copiedId = id;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}
</script>

<div class="min-h-screen bg-zine-off-white px-6 py-8">
	<div class="mx-auto max-w-4xl">
		<!-- Back nav -->
		<a
			href={resolve('/')}
			class="mb-8 inline-flex items-center gap-1.5 font-display text-[9px] font-bold tracking-[0.25em] text-zine-black/40 uppercase transition-colors hover:text-zine-black"
		>
			&#8592; Back to Vault
		</a>

		<!-- Header -->
		<div class="mb-10 border-b-2 border-zine-black pb-6">
			<p
				class="mb-2 font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
			>
				COMMUNICATION_CHANNELS
			</p>
			<h1 class="font-display text-2xl font-bold text-zine-black uppercase">Publish Queue</h1>
			<p class="mt-1.5 font-body text-sm text-zine-black/50">
				Review and approve captions before publishing
			</p>
		</div>

		{#if data.entries.length === 0}
			<div
				class="flex flex-col items-center gap-4 border-2 border-dashed border-zine-black/15 p-16 text-center"
			>
				<p class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/20 uppercase">
					NO_ENTRIES
				</p>
				<p class="font-body text-sm text-zine-black/40">No publish queue entries yet</p>
				<p class="font-body text-xs text-zine-black/25">
					Prepare a project for publishing to see captions here
				</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each data.entries as entry (entry.id)}
					<div class="border-2 border-zine-black bg-white p-6">
						<!-- Entry header -->
						<div class="mb-5 flex items-start justify-between gap-4">
							<div>
								<h2 class="font-display text-lg font-bold text-zine-black uppercase">
									{entry.title}
								</h2>
								{#if entry.platforms.length}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each entry.platforms as platform (platform)}
											<span
												class="bg-zine-black px-2 py-1 font-display text-[8px] font-bold tracking-widest text-zine-off-white uppercase"
											>
												{platform}
											</span>
										{/each}
									</div>
								{/if}
							</div>
							<span
								class="shrink-0 border-2 px-3 py-1.5 font-display text-[9px] font-bold tracking-widest uppercase
{entry.status === 'Published'
									? 'border-zine-green bg-zine-green text-zine-black'
									: entry.status === 'Approved'
										? 'border-zine-yellow bg-zine-yellow text-zine-black'
										: 'border-zine-black/15 bg-transparent text-zine-black/40'}"
							>
								{entry.status}
							</span>
						</div>

						<!-- Captions -->
						<div class="space-y-3">
							{#if entry.captionTwitter}
								<div class="border-2 border-zine-black/10 bg-zine-off-white p-4">
									<div class="mb-2 flex items-center justify-between">
										<p
											class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
										>
											TWITTER_X
										</p>
										<a
											href={shareUrl('twitter', entry.captionTwitter, entry.title, entry.hashtags)}
											target="_blank"
											rel="external noopener noreferrer"
											class="border-2 border-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase transition-colors hover:bg-zine-black hover:text-white"
											>POST →</a
										>
									</div>
									<p class="font-body text-sm text-zine-black/80">{entry.captionTwitter}</p>
								</div>
							{/if}

							{#if entry.captionLinkedIn}
								<div class="border-2 border-zine-black/10 bg-zine-off-white p-4">
									<div class="mb-2 flex items-center justify-between">
										<p
											class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
										>
											LINKEDIN
										</p>
										<a
											href={shareUrl(
												'linkedin',
												entry.captionLinkedIn,
												entry.title,
												entry.hashtags
											)}
											target="_blank"
											rel="external noopener noreferrer"
											class="border-2 border-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase transition-colors hover:bg-zine-black hover:text-white"
											>POST →</a
										>
									</div>
									<p class="font-body text-sm text-zine-black/80">{entry.captionLinkedIn}</p>
								</div>
							{/if}

							{#if entry.captionInstagram}
								<div class="border-2 border-zine-black/10 bg-zine-off-white p-4">
									<div class="mb-2 flex items-center justify-between">
										<p
											class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
										>
											INSTAGRAM
										</p>
										<button
											onclick={() =>
												copyCaption(
													entry.captionInstagram + (entry.hashtags ? '\n\n' + entry.hashtags : ''),
													entry.id + '-ig'
												)}
											class="border-2 border-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase transition-colors hover:bg-zine-black hover:text-white"
											>{copiedId === entry.id + '-ig' ? 'COPIED ✓' : 'COPY →'}</button
										>
									</div>
									<p class="font-body text-sm text-zine-black/80">{entry.captionInstagram}</p>
								</div>
							{/if}

							{#if entry.captionReddit}
								<div class="border-2 border-zine-black/10 bg-zine-off-white p-4">
									<div class="mb-2 flex items-center justify-between">
										<p
											class="font-display text-[9px] font-bold tracking-[0.3em] text-zine-black/40 uppercase"
										>
											REDDIT
										</p>
										<a
											href={shareUrl('reddit', entry.captionReddit, entry.title, '')}
											target="_blank"
											rel="external noopener noreferrer"
											class="border-2 border-zine-black px-2 py-1 font-display text-[9px] font-bold tracking-widest text-zine-black uppercase transition-colors hover:bg-zine-black hover:text-white"
											>POST →</a
										>
									</div>
									<p class="font-body text-sm text-zine-black/80">{entry.captionReddit}</p>
								</div>
							{/if}
						</div>

						<!-- Credit & hashtags -->
						{#if entry.creditLine || entry.hashtags}
							<div class="mt-4 flex flex-wrap gap-4 border-t-2 border-zine-black/5 pt-4">
								{#if entry.creditLine}
									<span
										class="font-display text-[9px] font-bold tracking-widest text-zine-black/40 uppercase"
									>
										CREDIT: {entry.creditLine}
									</span>
								{/if}
								{#if entry.hashtags}
									<span class="font-body text-xs text-zine-black/40">{entry.hashtags}</span>
								{/if}
							</div>
						{/if}

						<!-- Published timestamp -->
						{#if entry.publishedAt}
							<p
								class="mt-3 font-display text-[9px] font-bold tracking-widest text-zine-green uppercase"
							>
								DISPATCHED {new Date(entry.publishedAt).toLocaleString()}
							</p>
						{/if}

						<!-- Actions -->
						{#if entry.status !== 'Published'}
							<div class="mt-5 flex gap-3 border-t-2 border-zine-black/10 pt-5">
								<form method="POST" action="?/approve" use:enhance>
									<input type="hidden" name="entryId" value={entry.id} />
									<button
										type="submit"
										class="border-2 border-zine-yellow bg-zine-yellow px-5 py-3 font-display text-xs font-bold tracking-widest text-zine-black uppercase shadow-[3px_3px_0px_rgba(0,0,0,0.15)] transition-all duration-75 hover:translate-x-px hover:translate-y-px hover:shadow-none"
									>
										&#10003; Mark Published
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
