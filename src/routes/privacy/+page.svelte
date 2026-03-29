<script>
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy Policy — createthings</title>
</svelte:head>

<div class="min-h-screen bg-zine-black text-zine-off-white">
	<!-- Header -->
	<header class="flex items-center justify-between border-b-2 border-white/10 px-8 py-5">
		<a href={resolve('/')} class="font-display text-lg font-bold tracking-tight">
			<span class="bg-zine-yellow px-1.5 py-0.5 text-zine-black">create</span><span
				class="text-white">things</span
			>
		</a>
		<a
			href={resolve('/')}
			class="font-display text-xs font-bold tracking-widest text-white/50 uppercase transition-colors hover:text-zine-yellow"
		>
			← BACK
		</a>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-3xl px-8 py-20 md:px-12">
		<p class="mb-6 font-display text-xs font-bold tracking-[0.3em] text-zine-yellow uppercase">
			LEGAL_DOC — V1.0
		</p>
		<h1 class="mb-4 font-display text-5xl leading-none font-bold tracking-tight uppercase">
			PRIVACY<br /><span class="inline-block bg-zine-yellow px-3 py-1 text-zine-black">POLICY.</span
			>
		</h1>
		<p class="mb-16 font-body text-sm text-white/40">Last updated: March 29, 2026</p>

		<div class="space-y-14 font-body leading-relaxed text-white/70">
			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					01 — OVERVIEW
				</h2>
				<p>
					createthings ("we", "our", "the extension", "the app") is a creative workflow tool that
					helps you capture inspiration, analyze it with AI, and publish your work. This policy
					explains what data we collect, where it goes, and what we never do with it.
				</p>
				<p class="mt-4">
					We built this for creators who care about their work. We have no interest in selling,
					monetizing, or mishandling your data.
				</p>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					02 — WHAT WE COLLECT
				</h2>
				<div class="space-y-4">
					<div class="border-l-2 border-zine-yellow pl-4">
						<p class="mb-1 font-display text-xs font-bold tracking-widest text-white uppercase">
							Notion OAuth Token
						</p>
						<p>
							When you connect your Notion account, we receive an OAuth access token. This token is
							stored in a secure HTTP-only cookie in your browser session and is used exclusively to
							read and write to your own Notion workspace.
						</p>
					</div>
					<div class="border-l-2 border-zine-yellow pl-4">
						<p class="mb-1 font-display text-xs font-bold tracking-widest text-white uppercase">
							Page Content &amp; Screenshots
						</p>
						<p>
							When you capture a page, we receive the URL, page title, and optionally a screenshot
							or uploaded image. This data is sent to our server for AI analysis and then written
							directly to your Notion workspace. It is not stored on our servers beyond the duration
							of the request.
						</p>
					</div>
					<div class="border-l-2 border-zine-yellow pl-4">
						<p class="mb-1 font-display text-xs font-bold tracking-widest text-white uppercase">
							Extension Storage
						</p>
						<p>
							The browser extension stores your Notion connection status and API base URL in <code
								class="text-zine-yellow">chrome.storage.local</code
							>. This data never leaves your device.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					03 — WHAT WE DO NOT COLLECT
				</h2>
				<ul class="space-y-2">
					{#each ['We do not read, scan, or store the content of pages you visit.', 'We do not track your browsing history.', 'We do not collect personal information beyond what is required for Notion OAuth.', 'We do not use analytics, advertising SDKs, or third-party trackers.', 'We do not sell or share your data with any third party.'] as item (item)}
						<li class="flex items-start gap-3">
							<span class="mt-1 shrink-0 font-display text-xs font-bold text-zine-green">✓</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					04 — THIRD-PARTY SERVICES
				</h2>
				<p class="mb-6">
					createthings integrates with the following third-party services to deliver its core
					functionality. Each service receives only the minimum data required.
				</p>
				<div class="space-y-4">
					{#each [{ name: 'Notion', use: "Workspace storage and automation. Your data lives in your own Notion workspace. Notion's privacy policy applies to data stored there.", url: 'https://www.notion.so/privacy' }, { name: 'Google Gemini', use: 'AI visual and content analysis of captured screenshots and URLs. Images are submitted per request and not retained by us.', url: 'https://policies.google.com/privacy' }, { name: 'Groq', use: 'AI text generation for roadmaps, captions, and journal prompts.', url: 'https://groq.com/privacy-policy' }, { name: 'Uploadcare', use: 'Image hosting for uploaded inspiration images.', url: 'https://uploadcare.com/about/privacy-policy' }, { name: 'Vercel', use: 'Hosting provider for the SvelteKit web app. Standard server logs apply.', url: 'https://vercel.com/legal/privacy-policy' }] as service (service)}
						<div class="border-l-2 border-white/10 pl-4">
							<p class="mb-1 font-display text-xs font-bold tracking-widest text-white uppercase">
								{service.name}
							</p>
							<p class="mb-1">{service.use}</p>
							<a
								href={service.url}
								target="_blank"
								rel="noopener noreferrer"
								class="font-display text-[10px] tracking-widest text-zine-yellow/70 uppercase hover:text-zine-yellow"
							>
								Privacy Policy →
							</a>
						</div>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					05 — HOST PERMISSIONS
				</h2>
				<p>
					The createthings browser extension requests access to all URLs (<code
						class="text-zine-yellow">&lt;all_urls&gt;</code
					>). This permission exists solely to inject a screenshot selection overlay when you choose
					to capture a specific area of the current page.
				</p>
				<p class="mt-4">
					The content script does not read page content, DOM data, form inputs, passwords, or any
					other page information. It renders a visual overlay, captures the screenshot on
					confirmation, and sends only the resulting image to the app — nothing else.
				</p>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					06 — DATA RETENTION
				</h2>
				<p>
					All inspiration data, analyses, projects, and journal entries are stored in <strong
						class="text-white">your</strong
					> Notion workspace — not ours. You own it. You can delete it at any time by deleting the relevant
					pages or databases in Notion.
				</p>
				<p class="mt-4">
					Server-side, we retain no persistent user data. Session cookies expire when you close your
					browser or disconnect your Notion account.
				</p>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					07 — CHANGES TO THIS POLICY
				</h2>
				<p>
					If this policy changes materially, we will update the date at the top of this page.
					Continued use of createthings after a change constitutes acceptance of the updated policy.
				</p>
			</section>

			<section>
				<h2 class="mb-4 font-display text-xs font-bold tracking-[0.3em] text-zine-green uppercase">
					08 — CONTACT
				</h2>
				<p>
					Questions about this policy? Open an issue on the project repository or reach out directly
					via the contact listed on the Chrome Web Store listing.
				</p>
			</section>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t-2 border-white/10 px-8 py-8">
		<div class="mx-auto flex max-w-3xl items-center justify-between">
			<span class="font-display text-xs font-bold tracking-tight">
				<span class="bg-zine-yellow px-1 py-0.5 text-[10px] text-zine-black">create</span><span
					class="text-[10px] text-white/40">things</span
				>
			</span>
			<span class="font-display text-[10px] tracking-widest text-white/20 uppercase">
				© 2026 — ALL RIGHTS RESERVED
			</span>
		</div>
	</footer>
</div>
