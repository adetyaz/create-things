<script lang="ts">
	import { onMount } from 'svelte';
	import {
		api,
		capture,
		DEFAULT_API,
		getSettings,
		isSavableUrl,
		NotConnected,
		actOnReminder,
		adoptPet,
		checkIn,
		COPY_SITES,
		saveSiteChoice,
		siteChoices,
		type SiteChoice,
		completeStep,
		endFocus,
		startFocus,
		todayStep,
		waitingSaves,
		type FocusSession,
		type TodayStep,
		checkReminders,
		dueReviews,
		getPet,
		MOOD_COLOR,
		petSpecies,
		rateReview,
		recentSaves,
		saveSettings,
		splitDataUrl,
		undoSave,
		type PetView,
		type Reminder,
		type ReminderAction,
		type Rating,
		type SpeciesOption,
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
	let showMeals = $state(false);
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
	let species = $state<SpeciesOption[]>([]);
	let choice = $state('');
	let petName = $state('');

	const MOOD_WORD: Record<PetView['mood'], string> = {
		happy: 'happy',
		peckish: 'peckish',
		hungry: 'hungry',
		starving: 'starving',
		ran_away: 'away',
		dead: 'gone',
		resting: 'resting'
	};
	const breedChoices = $derived(
		species.flatMap((s) =>
			s.breeds.map((b) => ({ value: `${s.id}/${b.id}`, label: `${b.label} (${s.label})`, b }))
		)
	);
	const chosen = $derived(breedChoices.find((c) => c.value === choice));

	async function loadPet() {
		try {
			pet = await getPet();
			if (!pet && !species.length) {
				species = await petSpecies();
				choice = breedChoices[0]?.value ?? '';
			}
		} catch {
			pet = undefined;
		}
	}

	async function adopt() {
		const [speciesId, breedId] = choice.split('/');
		try {
			pet = await adoptPet(speciesId, breedId, petName.trim());
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
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

	async function markDone() {
		if (!next) return;
		try {
			const { fed } = await completeStep(next.stepId);
			nextResult = `Done.${fedText(fed)}`;
			void loadNext();
			void loadPet();
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
		} catch (e) {
			nextResult = e instanceof Error ? e.message : String(e);
		}
	}

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

	/** Today's reminders not acted on, and why none went out if they're held back. */
	let reminderList = $state<Reminder[]>([]);
	let held = $state<string | null>(null);

	async function loadReminders() {
		try {
			const check = await checkReminders();
			reminderList = [...check.fresh, ...check.open];
			held = check.held;
		} catch {
			reminderList = [];
		}
	}

	async function actOn(reminder: Reminder, action: ReminderAction) {
		try {
			await actOnReminder(reminder.id, action);
			reminderList = reminderList.filter((r) => r.id !== reminder.id);
			if (action === 'done') void loadPet();
			void chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
		} catch (e) {
			message = { ok: false, text: e instanceof Error ? e.message : String(e) };
		}
	}

	/** Today's reviews: the badge number. */
	let reviews = $state<ReviewCard[]>([]);
	let dueTotal = $state(0);
	let reviewing = $state(false);
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
				reviewing = false;
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
		const settings = await getSettings();
		apiBase = settings.apiBase;
		token = settings.token ?? '';
		const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
		tab = { id: active?.id, url: active?.url, title: active?.title };
		view = settings.token ? 'capture' : 'connect';
		if (settings.token) {
			void loadPet();
			void loadNext();
			void loadReminders();
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

<main class="flex w-[360px] flex-col gap-4 bg-stone-50 p-4 text-stone-900">
	<header class="flex items-center justify-between">
		<h1 class="text-base font-semibold">createthings</h1>
		{#if view === 'capture'}
			<span class="flex gap-3">
				<button class="text-xs text-stone-500 underline" onclick={openSettings}>Settings</button>
				<button class="text-xs text-stone-500 underline" onclick={() => (view = 'connect')}>
					Connection
				</button>
			</span>
		{:else if view === 'settings'}
			<button class="text-xs text-stone-500 underline" onclick={() => (view = 'capture')}
				>Back</button
			>
		{/if}
	</header>

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
		{#if pet}
			<section
				class="flex flex-col gap-1 rounded-lg border-l-4 border-stone-200 bg-white p-3"
				style="border-left-color: {MOOD_COLOR[pet.mood]}"
			>
				<p class="text-sm">
					<span class="font-medium">{pet.pet.name}</span> is {MOOD_WORD[pet.mood]}
					<span class="text-xs text-stone-500">· {pet.pet.personality}</span>
				</p>
				<p class="text-xs text-stone-600">{pet.why}</p>
				{#if pet.next}<p class="text-xs text-stone-500">{pet.next}.</p>{/if}
				{#if pet.comingHome}
					<p class="text-xs text-stone-600">
						Coming home: {pet.comingHome.done} of {pet.comingHome.needed} days of work.
					</p>
				{/if}
				<p class="text-xs text-stone-500">
					Ate {pet.today.eaten} of {pet.today.limit} today{pet.today.full
						? ': full, back tomorrow'
						: ''}.
					<button class="underline" onclick={() => (showMeals = !showMeals)}>
						{showMeals ? 'Hide meals' : 'Recent meals'}
					</button>
				</p>
				{#if showMeals}
					<ul class="text-xs text-stone-600">
						{#each pet.history.slice(0, 5) as meal (meal.at)}
							<li class="truncate" title={meal.label}>
								{meal.size} · {meal.label} · {new Date(meal.at).toLocaleDateString()}
							</li>
						{:else}
							<li>Nothing yet. Finish a step, today's reviews or a quiz.</li>
						{/each}
					</ul>
				{/if}
				<form
					class="mt-1 flex gap-1"
					onsubmit={(e) => {
						e.preventDefault();
						void sendCheckIn();
					}}
				>
					<input
						class="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs"
						bind:value={checkInText}
						placeholder="Did something? One line feeds {pet.pet.name}"
						maxlength="500"
					/>
					<button
						class="rounded-md bg-stone-900 px-2 py-1 text-xs text-white disabled:opacity-50"
						disabled={!checkInText.trim()}
					>
						Check in
					</button>
				</form>
				{#if checkInResult}<p class="text-xs text-stone-600">{checkInResult}</p>{/if}
				<p class="text-[11px] text-stone-400">
					The button's colour is {pet.pet.name}'s mood; its number is today's reviews.
				</p>
			</section>
		{:else if pet === null && breedChoices.length}
			<section class="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
				<p class="text-sm font-medium">Adopt your pet</p>
				<p class="text-xs text-stone-600">
					It eats when you do real work (steps, reviews, quizzes) and gets hungry when you don't.
				</p>
				<select class="rounded-md border border-stone-300 px-2 py-1.5 text-sm" bind:value={choice}>
					{#each breedChoices as c (c.value)}
						<option value={c.value}>{c.label}</option>
					{/each}
				</select>
				{#if chosen}
					<p class="text-xs text-stone-600">
						{chosen.b.personality}. <em>"{chosen.b.voice.gentle}"</em>
					</p>
				{/if}
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					bind:value={petName}
					placeholder="Name it"
					maxlength="40"
				/>
				<button
					class="self-end rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
					disabled={!petName.trim() || !choice}
					onclick={adopt}
				>
					Adopt
				</button>
			</section>
		{/if}

		{#if focusing}
			<section class="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
				<p class="text-sm">
					<span class="font-medium">Focusing:</span>
					{focusing.stepTitle}
				</p>
				<p class="text-2xl font-semibold tabular-nums">
					{focusLeft > 0 ? mmss(focusLeft) : "Time's up"}
				</p>
				<input
					class="rounded-md border border-stone-300 px-2 py-1 text-xs"
					bind:value={focusNote}
					placeholder="What did you do? (goes in your journal)"
				/>
				<button
					class="self-end rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
					onclick={stopFocus}
				>
					{focusLeft > 0 ? 'Stop early' : 'Finish'}
				</button>
			</section>
		{:else if next}
			<section class="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white p-3">
				<h2 class="text-xs font-medium text-stone-500">
					{next.fromPlan ? "Today's #1" : 'Next step'}
				</h2>
				<p class="text-sm font-medium">{next.title}</p>
				<p class="text-xs text-stone-600">{next.line}</p>
				{#if next.twoMinute}
					<p class="text-xs text-stone-600">2-minute start: {next.twoMinute}</p>
				{/if}
				{#if next.clash}
					<p class="text-xs text-amber-700">You're busy {next.clash} in your calendar.</p>
				{/if}
				<div class="mt-1 flex gap-2">
					<button
						class="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
						onclick={focus}
					>
						Focus {next.minutes} min
					</button>
					<button class="rounded-md border border-stone-300 px-3 py-1.5 text-xs" onclick={markDone}>
						Done
					</button>
				</div>
			</section>
		{/if}
		{#if nextResult}<p class="text-xs text-stone-600">{nextResult}</p>{/if}
		{#if waitingCount}
			<p class="text-xs text-amber-700">
				{waitingCount} save{waitingCount === 1 ? '' : 's'} waiting on this device: {waitingCount ===
				1
					? 'it sends'
					: 'they send'} when createthings can be reached.
			</p>
		{/if}

		{#if reminderList.length}
			<section class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
				<h2 class="text-xs font-medium text-stone-600">Reminders</h2>
				{#each reminderList as reminder (reminder.id)}
					<div class="flex flex-col gap-1">
						<p class="text-sm">{reminder.body}</p>
						<div class="flex flex-wrap gap-1">
							{#each reminder.actions.filter((a) => a.action !== 'start') as a (a.action)}
								<button
									class="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs"
									title={a.label}
									onclick={() => actOn(reminder, a.action)}
								>
									{a.action === 'two_minute' ? '2-minute version' : a.label}
								</button>
							{/each}
							<button
								class="px-1 text-xs text-stone-500 underline"
								onclick={() => actOn(reminder, 'dismiss')}
							>
								Not now
							</button>
						</div>
					</div>
				{/each}
			</section>
		{:else if held}
			<p class="text-[11px] text-stone-400">Reminders held: {held}.</p>
		{/if}

		{#if reviews.length || reviewedToday}
			<section class="flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
				{#if !reviews.length}
					<p class="text-sm">Reviews done for today ({reviewedToday}). Nice.</p>
				{:else if !reviewing}
					<div class="flex items-center justify-between gap-2">
						<p class="text-sm">
							<span class="font-medium">{reviews.length} to review today</span>
							<span class="block text-xs text-stone-600">
								Quick questions from steps you finished, so they stick{dueTotal > reviews.length
									? ` (${dueTotal - reviews.length} more wait for another day)`
									: ''}.
							</span>
						</p>
						<button
							class="shrink-0 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white"
							onclick={() => (reviewing = true)}
						>
							Start
						</button>
					</div>
				{:else}
					{@const card = reviews[0]}
					<p class="text-xs text-stone-500">
						{reviews.length} left{card.itemTitle ? ` · ${card.itemTitle}` : ''}
					</p>
					<p class="text-sm font-medium">{card.prompt}</p>
					{#if showAnswer}
						<p class="rounded-md bg-white p-2 text-sm">{card.answer}</p>
						<div class="grid grid-cols-3 gap-2">
							<button
								class="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs"
								onclick={() => rate(card, 'forgot')}>Forgot</button
							>
							<button
								class="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs"
								onclick={() => rate(card, 'shaky')}>Shaky</button
							>
							<button
								class="rounded-md bg-violet-700 px-2 py-1.5 text-xs font-medium text-white"
								onclick={() => rate(card, 'got_it')}>Got it</button
							>
						</div>
					{:else}
						<button
							class="self-start rounded-md border border-violet-300 bg-white px-3 py-1.5 text-xs"
							onclick={() => (showAnswer = true)}
						>
							Show answer
						</button>
					{/if}
				{/if}
			</section>
		{/if}

		<section class="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
			<p class="truncate text-sm font-medium" title={tab.title}>{tab.title || 'This page'}</p>
			<textarea
				class="min-h-14 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
				bind:value={note}
				placeholder="Add a note (optional)"
			></textarea>
			<label class="flex items-center gap-2 text-xs text-stone-600">
				<input type="checkbox" bind:checked={asReference} />
				Keep as a reference (not something to do)
			</label>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="rounded-md bg-stone-900 px-2 py-2 text-xs font-medium text-white disabled:opacity-50"
					disabled={busy || !canSavePage}
					onclick={savePage}
					title={canSavePage ? 'Save this page' : "This page can't be saved as a link"}
				>
					Save page
				</button>
				<button
					class="rounded-md border border-stone-300 px-2 py-2 text-xs font-medium disabled:opacity-50"
					disabled={busy}
					onclick={saveScreen}
				>
					Screenshot
				</button>
				<button
					class="rounded-md border border-stone-300 px-2 py-2 text-xs font-medium disabled:opacity-50"
					disabled={busy}
					onclick={pickArea}
				>
					Pick area
				</button>
			</div>
		</section>

		<section class="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
			<label class="flex flex-col gap-1 text-xs font-medium">
				I want to…
				<input
					class="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
					bind:value={want}
					placeholder="learn to make lo-fi beats"
					onkeydown={(e) => e.key === 'Enter' && want.trim() && saveWant()}
				/>
			</label>
			<button
				class="self-end rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
				disabled={busy || !want.trim()}
				onclick={saveWant}
			>
				Save
			</button>
		</section>

		{#if recent.length}
			<section class="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white p-3">
				<h2 class="text-xs font-medium text-stone-500">Recent saves</h2>
				<ul class="flex flex-col divide-y divide-stone-100">
					{#each recent as save (save.id)}
						<li class="flex items-center gap-2 py-1.5">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm" title={save.note ?? save.title}>{save.title}</p>
								<p class="text-xs text-stone-500">
									{stateOf(save)}{save.platform ? ` · ${save.platform}` : ''}
								</p>
							</div>
							{#if UNDOABLE.includes(save.status)}
								<button
									class="text-xs text-stone-500 underline"
									aria-label="Undo saving {save.title}"
									onclick={() => undo(save)}
								>
									Undo
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	{#if message}
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
