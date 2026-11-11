<script lang="ts">
	import { onMount } from 'svelte';
	import {
		api,
		capture,
		DEFAULT_API,
		getSettings,
		isSavableUrl,
		NotConnected,
		checkIn,
		COPY_SITES,
		saveSiteChoice,
		siteChoices,
		type SiteChoice,
		endFocus,
		startFocus,
		todayStep,
		waitingSaves,
		type FocusSession,
		type TodayStep,
		dueReviews,
		getPet,
		rateReview,
		recentSaves,
		saveSettings,
		splitDataUrl,
		undoSave,
		type PetView,
		type Rating,
		type RecentSave,
		type ReviewCard
	} from '../lib/api';

	type View = 'loading' | 'connect' | 'capture' | 'settings';

	/** Copy as you go, per site (Breakdown §2d): off until switched on; what copies become. */
	let choices = $state<Record<string, SiteChoice>>({});

	async function openSettings() {
		choices = await siteChoices();
		view = 'settings';
	}

	async function setChoice(site: string, change: Partial<SiteChoice>) {
		const next = { ...choices[site], ...change };
		choices = { ...choices, [site]: next };
		await saveSiteChoice(site, next);
	}

	let view = $state<View>('loading');
	let apiBase = $state(DEFAULT_API);
	let token = $state('');
	let tab = $state<{ id?: number; url?: string; title?: string }>({});
	let note = $state('');
	let want = $state('');
	let asReference = $state(false);
	let busy = $state(false);
	let message = $state<{ ok: boolean; text: string } | null>(null);
	/** The screenshot just saved, so you can see what was captured. */
	let preview = $state<string | null>(null);

	const canSavePage = $derived(isSavableUrl(tab.url));

	let recent = $state<RecentSave[]>([]);

	/** The pet: its mood is the badge colour. Undefined while loading, null before adopting. */
	let pet = $state<PetView | null | undefined>(undefined);
	let checkInText = $state('');
	let checkInResult = $state<string | null>(null);

	async function sendCheckIn() {
		const body = checkInText.trim();
		if (!body) return;
		try {
			const r = await checkIn(body);
			checkInText = '';
			checkInResult =
				r.fed?.status === 'fed'
					? `${r.fed.name} ate a ${r.fed.size}${r.about ? ` (about "${r.about.title}")` : ''}.`
					: r.fed?.status === 'full'
						? `${r.fed.name} is full for today. Saved to your journal.`
						: r.suggestFocus && r.about
							? `Saved. "${r.about.title}" isn't your focus yet, so no food: make it your focus to count it.`
							: r.about
								? `Saved to your journal (about "${r.about.title}").`
								: "Saved to your journal. It didn't match a Focus goal, so no food this time.";
			void loadPet();
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
		} catch (e) {
			checkInResult = e instanceof Error ? e.message : String(e);
		}
	}


	async function loadPet() {
		try {
			pet = await getPet();
		} catch {
			pet = undefined;
		}
	}


	/** Today's #1, a running focus session, and saves waiting to be sent. */
	let next = $state<TodayStep | null>(null);
	let focusing = $state<FocusSession | null>(null);
	let focusNote = $state('');
	let nextResult = $state<string | null>(null);
	let waitingCount = $state(0);
	let clock = $state(Date.now());

	const focusLeft = $derived(
		focusing
			? Math.max(0, new Date(focusing.startedAt).getTime() + focusing.minutes * 60_000 - clock)
			: 0
	);
	const mmss = (ms: number) =>
		`${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;

	async function loadNext() {
		try {
			next = await todayStep();
		} catch {
			next = null;
		}
		const stored = await chrome.storage.local.get('focusSession');
		focusing = (stored.focusSession as FocusSession | undefined) ?? null;
	}

	async function loadWaiting() {
		waitingCount = (await waitingSaves()).length;
	}

	const fedText = (fed: { status: string; size?: string; name?: string } | null) =>
		fed?.status === 'fed'
			? ` ${fed.name} ate a ${fed.size}.`
			: fed?.status === 'full'
				? ` ${fed.name} is full for today.`
				: '';


	async function focus() {
		if (!next) return;
		try {
			focusing = await startFocus(next.stepId, next.title);
			await chrome.storage.local.set({ focusSession: focusing });
			chrome.alarms.create('focus-done', {
				when: new Date(focusing.startedAt).getTime() + focusing.minutes * 60_000
			});
			nextResult = null;
		} catch (e) {
			nextResult = e instanceof Error ? e.message : String(e);
		}
	}

	async function stopFocus() {
		if (!focusing) return;
		try {
			const { minutes, fed } = await endFocus(focusing.id, focusNote.trim() || undefined);
			nextResult = `${minutes} minutes of focus.${fedText(fed) || (minutes < 10 ? ' (Under 10 minutes: no food this time.)' : '')}`;
			focusing = null;
			focusNote = '';
			await chrome.storage.local.remove('focusSession');
			chrome.alarms.clear('focus-done');
			void loadPet();
		} catch (e) {
			nextResult = e instanceof Error ? e.message : String(e);
		}
	}


	/** Today's reviews: the badge number. */
	let reviews = $state<ReviewCard[]>([]);
	let dueTotal = $state(0);
	let showAnswer = $state(false);
	let reviewedToday = $state(0);

	async function loadReviews() {
		try {
			const due = await dueReviews();
			reviews = due.cards;
			dueTotal = due.dueTotal;
		} catch {
			// The capture view still works; the badge shows "!" when not connected.
		}
	}

	async function rate(card: ReviewCard, rating: Rating) {
		try {
			await rateReview(card.id, rating);
			reviews = reviews.filter((c) => c.id !== card.id);
			reviewedToday += 1;
			showAnswer = false;
			if (!reviews.length) {
				void loadPet();
			}
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
	}

	/** New saves can still be undone; the rest have moved on (shortlist, focus, done). */
	const UNDOABLE = ['inbox', 'ready', 'reference'];

	function stateOf(save: RecentSave): string {
		if (save.status === 'reference') return 'Reference';
		if (save.analysisError && /credit/i.test(save.analysisError)) {
			return 'Saved · analysed when free credits refresh';
		}
		if (save.analysisError) return 'Analysis failed';
		if (save.status === 'inbox') return save.size ? 'Inbox' : 'Inbox · not analysed yet';
		if (save.status === 'ready') return 'Ready to sort';
		return save.status[0].toUpperCase() + save.status.slice(1);
	}

	async function loadRecent() {
		try {
			recent = await recentSaves();
		} catch (e) {
			if (e instanceof NotConnected) view = 'connect';
		}
	}

	async function undo(save: RecentSave) {
		try {
			await undoSave(save.id);
			recent = recent.filter((r) => r.id !== save.id);
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
	}

	onMount(async () => {
		void Promise.all([
			import('../lib/ct/ct-weather.js'),
			import('../lib/ct/ct-kawaii.js'),
			import('../lib/ct/ct-grime.js')
		]);
		const settings = await getSettings();
		apiBase = settings.apiBase;
		token = settings.token ?? '';
		const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
		tab = { id: active?.id, url: active?.url, title: active?.title };
		view = settings.token ? 'capture' : 'connect';
		if (settings.token) {
			void loadPet();
			void loadNext();
			void loadRecent();
			void loadReviews();
		}
		void loadWaiting();
	});

	// The focus timer ticks only while a session runs.
	$effect(() => {
		if (!focusing) return;
		const tick = setInterval(() => (clock = Date.now()), 1000);
		return () => clearInterval(tick);
	});

	async function connect() {
		busy = true;
		message = null;
		await saveSettings({ apiBase: apiBase.trim().replace(/\/$/, ''), token: token.trim() });
		try {
			await api('/api/extension/token');
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
			view = 'capture';
			void loadPet();
			void loadRecent();
			void loadReviews();
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
		busy = false;
	}

	async function run(done: string, work: () => Promise<unknown>) {
		busy = true;
		message = null;
		preview = null;
		try {
			const result = await work();
			const waiting = (result as { waiting?: boolean } | undefined)?.waiting;
			message = {
				ok: true,
				text: waiting ? 'Saved on this device. It sends when createthings can be reached.' : done
			};
			if (waiting) void loadWaiting();
			note = '';
			want = '';
			void loadRecent();
		} catch (e) {
			if (e instanceof NotConnected) view = 'connect';
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
		busy = false;
	}

	// Design system 11: the room strip follows the time of day and the pet's mood.
	const hour = new Date().getHours() + new Date().getMinutes() / 60;
	let showCheckIn = $state(false);
	let showWant = $state(false);
	let petAction = $state('auto');
	const tod =
		hour >= 5 && hour < 8.5
			? 'dawn'
			: hour >= 8.5 && hour < 17.5
				? 'day'
				: hour >= 17.5 && hour < 20.5
					? 'sunset'
					: 'night';
	const dark = tod !== 'day';
	const floor = { dawn: '#E7DCD2', day: '#ECE6DA', sunset: '#E3D2C3', night: '#2B2D3D' }[tod];
	const glass = dark
		? {
				bg: 'rgba(22,24,38,.42)',
				ink: '#F6F4EF',
				meta: '#D9D4CA',
				ring: 'inset 0 0 0 1px rgba(255,255,255,.14)'
			}
		: {
				bg: 'rgba(255,255,255,.5)',
				ink: '#1B1A17',
				meta: '#57534B',
				ring: 'inset 0 0 0 1px rgba(255,255,255,.65)'
			};
	const MOOD_STATE: Record<string, string> = {
		happy: 'happy',
		resting: 'happy',
		peckish: 'peckish',
		hungry: 'hungry',
		starving: 'starving',
		ran_away: 'ran',
		dead: 'died'
	};
	const ROOMS: Record<
		string,
		{ dust: number; webs: string; dot: string; short: (n: string) => string }
	> = {
		happy: { dust: 0, webs: '', dot: 'oklch(0.6 0.15 145)', short: (n) => `${n} is happy` },
		peckish: { dust: 0.55, webs: '', dot: 'oklch(0.75 0.12 80)', short: (n) => `${n} is peckish` },
		hungry: { dust: 0.8, webs: 'tr', dot: 'oklch(0.6 0.15 35)', short: (n) => `${n} is hungry` },
		starving: {
			dust: 1,
			webs: 'tr,tl',
			dot: 'oklch(0.6 0.15 35)',
			short: (n) => `${n} is starving`
		},
		ran: { dust: 1, webs: 'tr,tl', dot: '#78736A', short: (n) => `${n} ran away` },
		died: { dust: 0.6, webs: 'tr,tl', dot: '#78736A', short: (n) => `In memory of ${n}` },
		egg: { dust: 0, webs: '', dot: '#78736A', short: (n) => n }
	};
	const petState = $derived(pet ? (MOOD_STATE[pet.mood] ?? 'happy') : 'egg');
	const room = $derived(ROOMS[petState] ?? ROOMS.happy);

	const savedText = () => (asReference ? 'Kept as a reference' : 'Saved to your inbox');

	function savePage() {
		return run(savedText(), () =>
			capture({
				captureType: 'url',
				sourceUrl: tab.url!,
				title: tab.title,
				note: note.trim() || undefined,
				asReference
			})
		);
	}

	function saveScreen() {
		return run(savedText(), async () => {
			const shot = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
			if (!shot?.success) throw new Error(shot?.error ?? 'Could not take a screenshot');
			const { mime, base64 } = splitDataUrl(shot.dataUrl);
			preview = shot.dataUrl;
			return capture({
				captureType: 'screenshot',
				image: base64,
				mime,
				title: tab.title,
				sourceUrl: isSavableUrl(tab.url) ? tab.url : undefined,
				note: note.trim() || undefined,
				asReference
			});
		});
	}

	async function pickArea() {
		if (!tab.id) return;
		try {
			// Pages opened before the extension was installed don't have the picker yet.
			await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['screenshot.js'] });
		} catch {
			// Already there.
		}
		void chrome.tabs.sendMessage(tab.id, { type: 'START_AREA_SELECT' });
		window.close();
	}

	function saveWant() {
		return run('Saved. The pet will help you plan it', () =>
			capture({ captureType: 'note', note: want.trim() })
		);
	}
</script>

<main
	class={view === 'capture'
		? 'popup'
		: 'flex w-[360px] flex-col gap-4 bg-stone-50 p-4 text-stone-900'}
>
	{#if view !== 'capture'}
		<header class="flex items-center justify-between">
			<h1 class="text-base font-semibold">createthings</h1>
			{#if view === 'settings'}
				<button class="text-xs text-stone-500 underline" onclick={() => (view = 'capture')}
					>Back</button
				>
			{/if}
		</header>
	{/if}

	{#if view === 'settings'}
		<section class="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3">
			<h2 class="text-sm font-medium">Copy as you go</h2>
			<p class="text-xs text-stone-600">
				When you save on these sites with their own button, it's saved here too. Copies aren't
				analysed until you choose "Do this", so they cost nothing.
			</p>
			{#each COPY_SITES as site (site.id)}
				{@const choice = choices[site.id]}
				{#if choice}
					<div class="flex flex-col gap-1 border-t border-stone-100 pt-2">
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={choice.copy}
								onchange={(e) => setChoice(site.id, { copy: e.currentTarget.checked })}
							/>
							{site.label}
						</label>
						<p class="text-xs text-stone-500">{site.how}.</p>
						<label class="flex items-center gap-2 text-xs text-stone-600">
							They become
							<select
								class="rounded-md border border-stone-300 px-1 py-0.5 text-xs"
								value={choice.becomes}
								disabled={!choice.copy}
								onchange={(e) =>
									setChoice(site.id, { becomes: e.currentTarget.value as SiteChoice['becomes'] })}
							>
								<option value="ask">Ask me each time</option>
								<option value="reference">References</option>
								<option value="todo">To-dos (not analysed yet)</option>
							</select>
						</label>
					</div>
				{/if}
			{/each}
		</section>
	{:else if view === 'loading'}
		<p class="text-sm text-stone-500">Loading…</p>
	{:else if view === 'connect'}
		<section class="flex flex-col gap-3">
			<button
				class="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white"
				onclick={() =>
					chrome.tabs.create({
						url: `${apiBase.trim().replace(/\/$/, '')}/api/extension/link?ext=${chrome.runtime.id}`
					})}
			>
				Sign in with createthings
			</button>
			<p class="text-xs text-stone-500">
				Or paste a connection token (before sign-in is switched on, make one with
				<code>node.exe scripts/extension-token.mjs</code>).
			</p>
			<label class="flex flex-col gap-1 text-xs font-medium">
				Connection token
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					type="password"
					bind:value={token}
					placeholder="ct_…"
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs font-medium">
				App address
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					bind:value={apiBase}
				/>
			</label>
			<button
				class="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
				disabled={busy || !token.trim()}
				onclick={connect}
			>
				{busy ? 'Connecting…' : 'Connect'}
			</button>
		</section>
	{:else}
		<!-- Design system 11: extension popup, 360 × 560 -->
		<div class="room">
			<div class="fill" data-ct data-hour={hour} data-weather="clear">
				<ct-weather class="fill"></ct-weather>
			</div>
			<div
				class="floor"
				style:background="linear-gradient(180deg,rgba(0,0,0,0) 0%,{floor} 75%)"
			></div>
			<div
				class="fill"
				data-ct
				data-level={room.dust}
				data-webs={room.webs}
				data-fog="0"
				data-tone={dark ? 'dark' : 'light'}
				data-seed="22"
				style="pointer-events:none"
			>
				<ct-grime class="fill"></ct-grime>
			</div>
			{#if pet}
				<div
					class="room-pet"
					data-ct
					data-species={pet.pet.species}
					data-state={petState}
					data-action={petAction}
				>
					<ct-kawaii class="fill"></ct-kawaii>
				</div>
			{/if}
			<div
				class="brand"
				style:background={glass.bg}
				style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				style:color={glass.ink}
			>
				<span class="seal">ct</span>createthings
			</div>
			{#if pet}
				<div
					class="mood"
					style:background={glass.bg}
					style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				>
					<div class="mood-head" style:color={glass.ink}>
						<span class="dot" style:background={room.dot}></span>{room.short(pet.pet.name)}
					</div>
					<div class="mood-long" style:color={glass.meta}>{pet.why}</div>
					<button class="btn-xs" onclick={() => (showCheckIn = !showCheckIn)}>Check in</button>
				</div>
			{:else if pet === null}
				<div
					class="mood"
					style:background={glass.bg}
					style:box-shadow="{glass.ring},0 8px 24px rgba(27,26,23,.12)"
				>
					<div class="mood-head" style:color={glass.ink}>No pet yet</div>
					<button class="btn-xs" onclick={() => chrome.tabs.create({ url: `${apiBase}/start` })}
						>Meet your pet</button
					>
				</div>
			{/if}
		</div>

		<div class="body">
			{#if showCheckIn}
				<!-- 04: check-in input -->
				<div class="checkin">
					<input
						bind:value={checkInText}
						placeholder="did 5 minutes on the chords"
						onkeydown={(e) => e.key === 'Enter' && sendCheckIn()}
					/>
					<button class="btn-xs" onclick={sendCheckIn}>Check in</button>
				</div>
				{#if checkInResult}<div class="note">{checkInResult}</div>{/if}
			{/if}

			<!-- Reviews -->
			<div class="card reviews">
				<div class="row">
					<span class="strong"
						>{reviews.length
							? `Review ${reviewedToday + 1} of ${reviewedToday + reviews.length}`
							: dueTotal || reviewedToday
								? 'Reviews done'
								: 'No reviews due'}</span
					><span class="meta">{reviews.length} left</span>
				</div>
				{#if reviews[0]}
					{@const card = reviews[0]}
					<div class="q">{card.prompt}</div>
					{#if showAnswer}
						<div class="a">{card.answer}</div>
						<div class="grades">
							<button class="grade" onclick={() => rate(card, 'forgot')}>Forgot</button>
							<button class="grade" onclick={() => rate(card, 'shaky')}>Shaky</button>
							<button class="grade ink" onclick={() => rate(card, 'got_it')}>Got it</button>
						</div>
					{:else}
						<button class="btn-xs self-start" onclick={() => (showAnswer = true)}
							>Show answer</button
						>
					{/if}
				{:else if reviewedToday && pet}
					<div class="done-line">All done. + snack for {pet.pet.name}</div>
				{/if}
			</div>

			<!-- Today's #1 -->
			{#if focusing}
				<div class="card one">
					<div class="one-text">
						<div class="one-label">FOCUS · {mmss(focusLeft)}</div>
						<input class="one-note" bind:value={focusNote} placeholder="What did you do?" />
					</div>
					<button class="btn-xs" onclick={stopFocus}>End</button>
				</div>
			{:else if next}
				<div class="card one">
					<div class="one-text">
						<div class="one-label">TODAY'S #1 · {next.twoMinute ? 2 : next.minutes} MIN</div>
						<div class="one-title">{next.twoMinute ?? next.title}</div>
					</div>
					<button class="btn-xs" onclick={focus}>Start</button>
				</div>
			{/if}
			{#if nextResult}<div class="note">{nextResult}</div>{/if}

			<!-- Save -->
			<div class="saves">
				<button class="save-page" disabled={busy || !canSavePage} onclick={savePage}
					><span>Save this page</span><span class="kbd">⌥⇧S</span></button
				>
				<div class="save-row">
					<button class="save-small" disabled={busy} onclick={saveScreen}>Screenshot</button>
					<button class="save-small" onclick={pickArea}
						>Pick area <span class="kbd2">⌥⇧A</span></button
					>
					<button class="save-small" onclick={() => (showWant = !showWant)}>I want to…</button>
				</div>
				{#if showWant}
					<div class="checkin">
						<input
							bind:value={want}
							placeholder="learn jazz piano chords"
							onkeydown={(e) => e.key === 'Enter' && want.trim() && saveWant()}
						/>
						<button class="btn-xs" disabled={!want.trim() || busy} onclick={saveWant}>Save</button>
					</div>
				{/if}
				{#if message}<div class="note" class:bad={!message.ok} role="status">
						{message.text}
					</div>{/if}
				{#if waitingCount}<div class="note">
						{waitingCount} saved on this device, waiting to send.
					</div>{/if}
			</div>

			<!-- Recent saves -->
			<div class="recent-head">
				<span>Recent saves</span><button
					class="see-all"
					onclick={() => chrome.tabs.create({ url: `${apiBase}/app` })}
					>See all {recent.length}</button
				>
			</div>
			<div class="card list">
				{#each recent.slice(0, 3) as save, i (save.id)}
					<div class="save" class:line={i < Math.min(recent.length, 3) - 1}>
						{#if save.captureType === 'url'}
							<div class="thumb link">Link</div>
						{:else}
							<div class="thumb"></div>
						{/if}
						<div class="save-text">
							<span class="save-title">{save.title}</span><span class="meta">{stateOf(save)}</span>
						</div>
						{#if UNDOABLE.includes(save.status)}<button class="undo" onclick={() => undo(save)}
								>Undo</button
							>{/if}
					</div>
				{:else}
					<div class="save"><span class="meta">Nothing saved yet.</span></div>
				{/each}
			</div>
			<div class="foot">
				<button class="see-all" onclick={openSettings}>Settings</button><button
					class="see-all"
					onclick={() => (view = 'connect')}>Connection</button
				>
			</div>
		</div>
	{/if}

	{#if message && view !== 'capture'}
		<p class="text-sm {message.ok ? 'text-green-700' : 'text-red-700'}" role="status">
			{message.text}
		</p>
		{#if message.ok && preview}
			<img
				src={preview}
				alt="The screenshot that was saved"
				class="max-h-48 w-full rounded-md border border-stone-200 object-contain"
			/>
		{/if}
	{/if}
</main>

<style>
	/* Design system 11: extension popup, 360 × 560. */
	.popup {
		position: relative;
		width: 360px;
		height: 560px;
		overflow: hidden;
		background: #f6f4ef;
		display: flex;
		flex-direction: column;
		font-family: 'Geist', sans-serif;
		color: #1b1a17;
	}
	.fill {
		position: absolute;
		inset: 0;
	}
	.room {
		position: relative;
		height: 112px;
		flex: none;
		overflow: hidden;
		background: #b9c8d8;
	}
	.floor {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 46px;
	}
	.room-pet {
		position: absolute;
		left: 4px;
		bottom: -14px;
		width: 120px;
		height: 120px;
	}
	.brand {
		position: absolute;
		left: 10px;
		top: 10px;
		display: flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px 0 6px;
		border-radius: 999px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		font-size: 12px;
		font-weight: 600;
	}
	.seal {
		width: 18px;
		height: 18px;
		border: 1.5px solid oklch(0.6 0.15 35);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 11px;
		color: oklch(0.5 0.15 35);
		transform: rotate(-4deg);
	}
	.mood {
		position: absolute;
		right: 10px;
		bottom: 10px;
		width: 204px;
		padding: 10px 12px;
		border-radius: 14px;
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.mood-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.mood-long {
		font-size: 11px;
		line-height: 1.35;
	}
	.btn-xs {
		align-self: flex-start;
		height: 24px;
		padding: 0 10px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 11px;
		font-weight: 500;
		flex: none;
	}
	.body {
		flex: 1;
		overflow-y: auto;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.card {
		background: #fff;
		border-radius: 14px;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
	}
	.reviews {
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.strong {
		font-size: 12px;
		font-weight: 600;
	}
	.meta {
		font-size: 11px;
		color: #5f5a52;
	}
	.q {
		font-family: 'Instrument Serif', serif;
		font-size: 18px;
		line-height: 1.2;
	}
	.a {
		font-size: 13px;
		color: #57534b;
	}
	.grades {
		display: flex;
		gap: 6px;
	}
	.grade {
		flex: 1;
		height: 26px;
		border-radius: 999px;
		background: #efece5;
		font-size: 12px;
		font-weight: 500;
		color: #1b1a17;
	}
	.grade.ink {
		background: #1b1a17;
		color: #fff;
	}
	.done-line {
		font-size: 13px;
		color: oklch(0.4 0.1 145);
	}
	.one {
		padding: 10px 12px 10px 14px;
		display: flex;
		align-items: center;
		gap: 10px;
		box-shadow: 0 0 0 1.5px oklch(0.6 0.15 35);
	}
	.one-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.one-label {
		font-size: 10px;
		font-weight: 600;
		color: oklch(0.48 0.14 35);
		letter-spacing: 0.02em;
	}
	.one-title {
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.one-note {
		font-size: 13px;
		background: transparent;
		outline: none;
	}
	.one .btn-xs {
		height: 26px;
		padding: 0 12px;
		font-size: 12px;
		align-self: center;
	}
	.saves {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.save-page {
		height: 34px;
		border-radius: 12px;
		background: #1b1a17;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 14px;
	}
	.kbd {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #b8b2a6;
	}
	.save-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
	}
	.save-small {
		height: 30px;
		border-radius: 10px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
		font-weight: 500;
		color: #1b1a17;
	}
	.kbd2 {
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		color: #5f5a52;
	}
	.checkin {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 40px;
		padding: 0 6px 0 14px;
		background: #efece5;
		border-radius: 14px;
	}
	.checkin:focus-within {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.checkin input {
		flex: 1;
		min-width: 0;
		background: transparent;
		outline: none;
		font-size: 13px;
	}
	.checkin .btn-xs {
		align-self: center;
		height: 28px;
		padding: 0 12px;
		font-size: 12px;
	}
	.note {
		font-size: 11px;
		line-height: 1.4;
		color: #57534b;
	}
	.note.bad {
		color: oklch(0.5 0.15 35);
	}
	.recent-head {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: #5f5a52;
		padding: 2px 2px 0;
	}
	.see-all {
		font-size: 11px;
		color: #5f5a52;
	}
	.list {
		display: flex;
		flex-direction: column;
	}
	.save {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
	}
	.save.line {
		border-bottom: 1px solid #efece5;
	}
	.thumb {
		width: 32px;
		height: 32px;
		flex: none;
		border-radius: 8px;
		background: repeating-linear-gradient(135deg, #ece8e0 0 4px, #f3f0ea 4px 8px);
	}
	.thumb.link {
		background: #efece5;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		color: #57534b;
	}
	.save-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.save-title {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.undo {
		font-size: 11px;
		color: #57534b;
	}
	.foot {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 2px;
	}
	button {
		cursor: pointer;
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	button:active {
		transform: scale(0.97);
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
</style>
