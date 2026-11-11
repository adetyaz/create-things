<script lang="ts">
	import { resolve } from '$app/paths';

	/** Everything on the home page below the sky: how it works, the pet, memory, cost, last call. */
	let {
		extensionUrl,
		species,
		returning = false
	}: { extensionUrl: string; species: string; returning?: boolean } = $props();

	const STEPS = [
		{
			n: '01',
			label: 'CAPTURE',
			title: 'Save it the moment it inspires you',
			body: 'A link, a note, a screenshot. From the app or the browser extension, in one tap.'
		},
		{
			n: '02',
			label: 'PICK ONE',
			title: 'Your pet picks one thing',
			body: 'Tell it how much time and energy you have. It chooses one thing that fits, and says why.'
		},
		{
			n: '03',
			label: 'START SMALL',
			title: 'A first step you can do now',
			body: 'Every idea becomes steps of 15 to 30 minutes, starting with a two-minute version.'
		},
		{
			n: '04',
			label: 'REMEMBER',
			title: 'Keep what you learn',
			body: 'Journal a line after each session. Short reviews bring it back until it sticks.'
		}
	];

	/** Pet moods (design system section 09; the server's default timings). */
	const MOODS = [
		{ state: 'happy', name: 'Happy', when: '0–2 days', note: 'Fed and bouncy' },
		{ state: 'peckish', name: 'Peckish', when: '3–6 days', note: 'A film of dust' },
		{ state: 'hungry', name: 'Hungry', when: '7–13 days', note: 'Cobwebs, slower' },
		{ state: 'starving', name: 'Starving', when: '14–29 days', note: 'Barely moving' }
	];
</script>

<div class="sections">
	<!-- How it works -->
	<section class="wrap" aria-labelledby="how">
		<p class="kicker">How it works</p>
		<h2 id="how" class="h2">Too many ideas. <em>One</em> thing at a time.</h2>
		<ol class="steps">
			{#each STEPS as s (s.n)}
				<li class="card step">
					<span class="mono">{s.n} · {s.label}</span>
					<span class="step-title">{s.title}</span>
					<span class="body">{s.body}</span>
				</li>
			{/each}
		</ol>
	</section>

	<!-- The pet -->
	<section class="wrap" aria-labelledby="pet">
		<div class="split">
			<div>
				<p class="kicker">Your pet</p>
				<h2 id="pet" class="h2">It eats when you <em>show up</em>.</h2>
				<p class="lead">
					Finish a step, a focus session or a journal line, and your pet gets a meal. Skip a few
					days and it gets hungry, and the room gathers dust. After 30 days it runs away; three days
					of showing up bring it home. Going on holiday? Tell it to rest and nothing changes.
				</p>
				<p class="body mt">
					Dog, cat, rabbit or bird, each with its own voice, from gentle to blunt. You choose.
				</p>
			</div>
			<ul class="moods" aria-label="How your pet looks as days pass without activity">
				{#each MOODS as m (m.state)}
					<li class="card mood">
						<span
							class="mood-pet"
							data-ct
							data-species={species}
							data-state={m.state}
							data-action="idle"
							aria-hidden="true"
						>
							<ct-kawaii class="fill"></ct-kawaii>
						</span>
						<span class="mood-name">{m.name}</span>
						<span class="mono">{m.when}</span>
						<span class="mood-note">{m.note}</span>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- Memory -->
	<section class="wrap" aria-labelledby="memory">
		<div class="split reverse">
			<div>
				<p class="kicker">Memory</p>
				<h2 id="memory" class="h2">It <em>remembers</em>, so you don't have to.</h2>
				<p class="lead">
					What you're making, where you got stuck, what worked. Your pet uses it to pick and plan,
					and tells you which memory it used. A summary of each one is kept on Walrus, so your
					history isn't locked inside one app.
				</p>
				<p class="body mt">
					You can see everything it knows, in plain words, and delete any of it. Nothing is used
					without showing you.
				</p>
			</div>
			<div class="stack">
				<div class="card memo">
					<span class="mono">MEMORY · WHAT YOU LEARNED</span>
					<p class="quote">“You struggled with left-hand stretches on the F.”</p>
					<span class="memo-foot"><span>Tue 28 Oct</span><span class="quiet">Delete</span></span>
				</div>
				<div class="card memo">
					<span class="mono">BASED ON</span>
					<p class="cite">
						<span class="chip">you struggled with left-hand stretches</span>
						<span class="chip">your goal: Blue Bossa</span>
					</p>
					<p class="body">So today's step is slow shell voicings, left hand only.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Cost -->
	<section class="wrap" aria-labelledby="cost">
		<div class="card price">
			<div>
				<p class="kicker">What it costs</p>
				<h2 id="cost" class="h2 small">Free every day. <em>Pay</em> only for extra.</h2>
				<p class="body">
					Every day you get 20 free credits for the AI parts: reading a save, planning steps,
					talking to your pet. Saving, sorting, planning your week and moving things around are
					always free. Need more? Buy a small pack; there's no subscription.
				</p>
			</div>
			<div class="meter" aria-label="Example: 14 of 20 free credits left today">
				<span class="mono">FREE TODAY</span>
				<span class="meter-num">14 <span class="quiet">of 20</span></span>
				<span class="bar"><span style="width: 70%"></span></span>
				<span class="mono">Resets every day</span>
			</div>
		</div>
	</section>

	<!-- Last call -->
	<section class="wrap final" aria-labelledby="final">
		<h2 id="final" class="h2 big">Pick one thing. <em>Start it today.</em></h2>
		<p class="lead centre">Two minutes to set up. Your pet is waiting.</p>
		<div class="ctas">
			<a href={resolve(returning ? '/today' : '/start')} class="btn-ink"
				>{returning ? 'Open today' : 'Try it free'}</a
			>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the Chrome Web Store, not an app route -->
			<a href={extensionUrl} target="_blank" rel="noopener" class="btn-soft desktop-only">
				Get the browser extension
			</a>
		</div>
	</section>

	<footer class="wrap foot">
		<span class="brand"><span class="seal" aria-hidden="true">ct</span>createthings</span>
		<nav class="foot-links" aria-label="Footer">
			<a href={resolve('/signin')}>Sign in</a>
			<a href={resolve('/privacy')}>Privacy</a>
		</nav>
	</footer>
</div>

<style>
	.sections {
		background-color: var(--color-paper);
		background-image: radial-gradient(var(--color-line) 1px, transparent 1px);
		background-size: 22px 22px;
		color: var(--color-ink);
		padding-bottom: env(safe-area-inset-bottom);
	}
	.wrap {
		width: 100%;
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(56px, 10vw, 112px) max(16px, env(safe-area-inset-left)) 0;
	}
	.kicker {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: clamp(22px, 2.6vw, 30px);
		color: var(--color-ink-3);
	}
	.h2 {
		margin-top: 6px;
		max-width: 18ch;
		font-family: var(--font-serif);
		font-size: clamp(36px, 5.4vw, 64px);
		line-height: 1.02;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.h2.small {
		font-size: clamp(32px, 4vw, 48px);
	}
	.h2.big {
		max-width: 16ch;
		margin: 0 auto;
		text-align: center;
		font-size: clamp(42px, 7vw, 88px);
	}
	.h2 em {
		color: var(--color-seal);
	}
	.lead {
		margin-top: 18px;
		max-width: 36rem;
		font-size: clamp(15px, 0.6vw + 12px, 17px);
		line-height: 1.6;
		color: var(--color-ink-2);
		text-wrap: pretty;
	}
	.lead.centre {
		margin-left: auto;
		margin-right: auto;
		text-align: center;
	}
	.body {
		font-size: 14px;
		line-height: 1.55;
		color: var(--color-ink-2);
		text-wrap: pretty;
	}
	.mt {
		margin-top: 12px;
		max-width: 34rem;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.02em;
		color: var(--color-ink-3);
	}
	.card {
		background: var(--color-card);
		border-radius: 20px;
		box-shadow: var(--shadow-card);
	}

	/* How it works: 1 column on phones, 2 on tablets, 4 on wide screens. */
	.steps {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
		margin-top: clamp(28px, 4vw, 44px);
	}
	@media (min-width: 640px) {
		.steps {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.steps {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.step {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 20px;
	}
	.step-title {
		font-size: 17px;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}

	/* Text beside a visual; stacked on phones and tablets. */
	.split {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(28px, 5vw, 64px);
		align-items: center;
	}
	@media (min-width: 900px) {
		.split {
			grid-template-columns: 1fr 1fr;
		}
		.split.reverse > :first-child {
			order: 2;
		}
	}

	.moods {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}
	.mood {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 10px 10px 14px;
		text-align: center;
	}
	.mood-pet {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1.15;
		max-height: 170px;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.mood-name {
		font-size: 15px;
		font-weight: 600;
	}
	.mood-note {
		font-size: 13px;
		color: var(--color-ink-2);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.memo {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
	}
	.memo:first-child {
		transform: rotate(-1.2deg);
	}
	.memo:last-child {
		margin-left: clamp(0px, 4vw, 40px);
		transform: rotate(0.8deg);
	}
	.quote {
		font-family: var(--font-serif);
		font-size: clamp(22px, 2.4vw, 28px);
		line-height: 1.2;
	}
	.memo-foot {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--color-ink-3);
	}
	.quiet {
		color: var(--color-ink-3);
	}
	.cite {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 12px;
		background: var(--color-paper-sunk);
		color: var(--color-ink-2);
	}

	.price {
		display: grid;
		grid-template-columns: 1fr;
		gap: 28px;
		padding: clamp(22px, 4vw, 44px);
	}
	.price .body {
		margin-top: 14px;
		max-width: 36rem;
	}
	@media (min-width: 800px) {
		.price {
			grid-template-columns: 1.6fr 1fr;
			align-items: center;
		}
	}
	.meter {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 18px;
		border-radius: 16px;
		background: var(--color-paper);
	}
	.meter-num {
		font-family: var(--font-serif);
		font-size: 44px;
		line-height: 1;
	}
	.meter-num .quiet {
		font-size: 22px;
	}
	.bar {
		height: 8px;
		border-radius: 999px;
		background: var(--color-line);
		overflow: hidden;
	}
	.bar > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--color-ink);
	}

	.final {
		padding-bottom: clamp(56px, 9vw, 104px);
	}
	.ctas {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 28px;
	}
	.btn-ink,
	.btn-soft {
		display: inline-flex;
		height: 44px;
		align-items: center;
		border-radius: 999px;
		padding: 0 22px;
		font-size: 15px;
		font-weight: 500;
		transition: transform 160ms ease;
	}
	.btn-ink {
		background: var(--color-ink);
		color: var(--color-on-ink);
	}
	.btn-soft {
		background: var(--color-card);
		box-shadow: 0 0 0 1px var(--color-line);
	}
	.btn-ink:hover,
	.btn-soft:hover {
		transform: translateY(-1px);
	}
	.btn-ink:active,
	.btn-soft:active {
		transform: scale(0.97);
	}
	a:focus-visible {
		outline: 2px solid var(--color-seal);
		outline-offset: 3px;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 24px;
		padding-bottom: 28px;
		border-top: 1px solid var(--color-line);
		font-size: 13px;
		color: var(--color-ink-3);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--color-ink);
	}
	.seal {
		display: flex;
		width: 24px;
		height: 24px;
		align-items: center;
		justify-content: center;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 4px;
		font-family: var(--font-serif);
		font-size: 14px;
		font-weight: 400;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
	}
	.foot-links {
		display: flex;
		gap: 18px;
	}
	.foot-links a:hover {
		color: var(--color-ink);
	}
	@media (hover: none) and (pointer: coarse) {
		.desktop-only {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.btn-ink,
		.btn-soft {
			transition: none;
		}
	}
</style>
