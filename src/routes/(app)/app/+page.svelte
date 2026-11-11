<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import ItemSheet from '$lib/components/canvas/ItemSheet.svelte';
	import CapturePanel from '$lib/components/canvas/CapturePanel.svelte';
	import { reduced, rise } from '$lib/motion';
	import { refreshShell, shell, PET_STATE } from '$lib/shell.svelte';
	import { coverFor } from '$lib/covers';

	/**
	 * The canvas (design 10): one framed sheet of paper in the middle of the screen. The capture
	 * pill sits at its top centre and the one next step in its centre ("Inbox · N new things ·
	 * Sort them"), as section 10 draws them. Saved things are gathered in one grid around that
	 * centre, one place per group (Shortlist and each intent), each a small stack under an italic
	 * label. Tap a group to open it in place (16B fan); tap a card to open it (05 + 06).
	 */

	type Item = {
		id: string;
		title: string;
		sourceUrl: string | null;
		note: string | null;
		captureType: string;
		status: string;
		intent: string;
		analysisError: string | null;
	};
	type Group = { id: string; label: string; things: Item[] };

	const STATUS: Record<string, string> = {
		inbox: 'Inbox · not analysed yet',
		ready: 'Ready to sort',
		shortlist: 'Shortlist',
		focus: 'Doing',
		paused: 'Paused',
		done: 'Done',
		reference: 'Reference'
	};
	const INTENT: Record<string, string> = {
		learn: 'Learn',
		make: 'Make',
		course: 'Course',
		try: 'Try',
		tend: 'Tend',
		habit: 'Habit'
	};
	/** Grid places around the centre, filled in this order so a few groups still look balanced. */
	const SLOTS = ['1 / 2', '2 / 1', '2 / 3', '3 / 2', '1 / 1', '1 / 3', '3 / 1', '3 / 3'];

	let items = $state<Item[] | null>(null);
	let problem = $state<string | null>(null);

	/** The group opened in place, or null for the grid. */
	let group = $state<string | null>(null);
	/** The opened thing (03 + 05 + 06), and whether we're sorting one at a time. */
	let open = $state<{ id: string; origin: DOMRect | null; sorting: boolean } | null>(null);
	/** Put off with "Keep for later" during this visit's sort. */
	let skipped = $state<string[]>([]);
	/** The capture "+" panel (when the bar is empty). */
	let panelOpen = $state(false);
	const reduce = reduced();

	let text = $state('');
	let image = $state<{ base64: string; preview: string } | null>(null);
	let saving = $state(false);
	let input = $state<HTMLInputElement>();
	let fileInput = $state<HTMLInputElement>();

	/** Saved in this visit: local image preview and whether it's still being read. */
	let fresh = $state<Record<string, { preview?: string; reading: boolean }>>({});
	/** Save toast (section 11): shows what was saved for 6 s, longer while hovered. */
	let toast = $state<{ item: Item; preview?: string; left: number } | null>(null);
	let toastHover = $state(false);

	const live = $derived((items ?? []).filter((i) => i.status !== 'archived'));
	const groups = $derived.by<Group[]>(() => {
		const out: Group[] = [];
		const short = live.filter((i) => i.status === 'shortlist');
		if (short.length) out.push({ id: 'shortlist', label: 'Shortlist', things: short });
		for (const intent of [...new Set(live.map((i) => i.intent))]) {
			out.push({
				id: intent,
				label: INTENT[intent] ?? intent,
				things: live.filter((i) => i.intent === intent)
			});
		}
		return out.slice(0, 8);
	});
	const opened = $derived(groups.find((g) => g.id === group) ?? null);
	const newCount = $derived(
		live.filter((i) => i.status === 'inbox' || i.status === 'ready').length
	);
	const toSort = $derived(live.filter((i) => i.status === 'ready').length);
	const queue = $derived(
		live.filter((i) => i.status === 'ready' && !skipped.includes(i.id)).map((i) => i.id)
	);
	const statusWord = (status: string) => STATUS[status] ?? status;
	const petForSheet = $derived(
		shell.pet
			? {
					name: shell.pet.pet.name,
					species: shell.pet.pet.species,
					state: PET_STATE[shell.pet.mood] ?? 'happy'
				}
			: null
	);

	const hostOf = (url: string | null) => {
		try {
			return url ? new URL(url).hostname.replace(/^www\./, '') : null;
		} catch {
			return null;
		}
	};
	const plural = (n: number) => (n === 1 ? 'thing' : 'things');

	// Groups can be dragged anywhere inside the canvas; a press that doesn't move opens the group.
	// Where each one was moved to is kept on this device.
	const MOVED_KEY = 'ct:canvas:v1';
	let moved = $state<Record<string, { x: number; y: number }>>({});
	let dragging = $state<string | null>(null);
	let mapEl = $state<HTMLElement>();
	let drag = {
		id: '',
		x: 0,
		y: 0,
		ox: 0,
		oy: 0,
		rect: null as DOMRect | null,
		frame: null as DOMRect | null,
		moved: false
	};

	function placeDown(e: PointerEvent, id: string) {
		if (e.button !== 0) return;
		const el = e.currentTarget as HTMLElement;
		const o = moved[id] ?? { x: 0, y: 0 };
		drag = {
			id,
			x: e.clientX,
			y: e.clientY,
			ox: o.x,
			oy: o.y,
			rect: el.getBoundingClientRect(),
			frame: mapEl?.getBoundingClientRect() ?? null,
			moved: false
		};
		el.setPointerCapture(e.pointerId);
	}
	function placeMove(e: PointerEvent) {
		if (!drag.id) return;
		let dx = e.clientX - drag.x;
		let dy = e.clientY - drag.y;
		if (!drag.moved && Math.hypot(dx, dy) < 5) return;
		drag.moved = true;
		dragging = drag.id;
		// Keep the group inside the canvas.
		if (drag.rect && drag.frame) {
			dx = Math.max(
				drag.frame.left - drag.rect.left,
				Math.min(drag.frame.right - drag.rect.right, dx)
			);
			dy = Math.max(
				drag.frame.top - drag.rect.top,
				Math.min(drag.frame.bottom - drag.rect.bottom, dy)
			);
		}
		moved[drag.id] = { x: drag.ox + dx, y: drag.oy + dy };
	}
	function placeUp(id: string) {
		const wasDrag = drag.moved;
		drag = { ...drag, id: '' };
		dragging = null;
		if (wasDrag) {
			try {
				localStorage.setItem(MOVED_KEY, JSON.stringify(moved));
			} catch {
				// storage blocked: the arrangement lasts for this visit
			}
		} else group = id;
	}
	// Dragging the empty paper moves everything inside the canvas.
	let pan = $state({ x: 0, y: 0 });
	let panning = $state(false);
	let panFrom = { x: 0, y: 0, px: 0, py: 0, on: false };
	function panDown(e: PointerEvent) {
		if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
		if (e.pointerType === 'touch' && innerWidth <= 720) return; // phones scroll instead
		panFrom = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, on: true };
		panning = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function panMove(e: PointerEvent) {
		if (!panFrom.on || !mapEl) return;
		const r = mapEl.parentElement?.getBoundingClientRect();
		const lx = (r?.width ?? 800) * 0.4;
		const ly = (r?.height ?? 600) * 0.4;
		pan = {
			x: Math.max(-lx, Math.min(lx, panFrom.px + e.clientX - panFrom.x)),
			y: Math.max(-ly, Math.min(ly, panFrom.py + e.clientY - panFrom.y))
		};
	}
	function panUp() {
		if (!panFrom.on) return;
		panFrom.on = false;
		panning = false;
		try {
			localStorage.setItem(PAN_KEY, JSON.stringify(pan));
		} catch {
			// storage blocked
		}
	}
	const PAN_KEY = 'ct:canvas-pan:v1';

	function resetLayout() {
		pan = { x: 0, y: 0 };
		try {
			localStorage.removeItem(PAN_KEY);
		} catch {
			// nothing saved
		}
		moved = {};
		try {
			localStorage.removeItem(MOVED_KEY);
		} catch {
			// nothing saved
		}
	}

	function failed(e: unknown) {
		if (e instanceof ApiError && e.needsSignIn) {
			window.location.assign(`${resolve('/signin')}?next=/app`);
			return;
		}
		problem = e instanceof Error ? e.message : 'Something went wrong. Try again.';
	}

	async function load() {
		problem = null;
		try {
			items = (await api<{ items: Item[] }>('/api/items')).items;
		} catch (e) {
			failed(e);
		}
	}

	onMount(() => {
		const params = new URL(location.href).searchParams;
		if (params.get('view') === 'shortlist') group = 'shortlist';
		const sortNow = params.has('sort');
		try {
			pan = JSON.parse(localStorage.getItem(PAN_KEY) ?? 'null') ?? { x: 0, y: 0 };
			moved = JSON.parse(localStorage.getItem(MOVED_KEY) ?? '{}') ?? {};
		} catch {
			// first visit, or storage blocked
		}
		load().then(() => {
			if (sortNow) startSort();
		});
		import('$lib/ct/ct-kawaii.js');
		const keys = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				input?.focus();
			}
		};
		addEventListener('keydown', keys);
		const timer = setInterval(() => {
			if (toast && !toastHover)
				toast = toast.left <= 100 ? null : { ...toast, left: toast.left - 100 };
		}, 100);
		return () => {
			removeEventListener('keydown', keys);
			clearInterval(timer);
		};
	});

	async function readImage(file: File) {
		if (!file.type.startsWith('image/')) return;
		const bitmap = await createImageBitmap(file).catch(() => null);
		if (!bitmap) return;
		const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
		image = { base64: dataUrl.split(',')[1], preview: dataUrl };
		input?.focus();
	}
	function onPaste(e: ClipboardEvent) {
		const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
		if (file) {
			e.preventDefault();
			readImage(file);
		}
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file) return readImage(file);
		const dropped = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text');
		if (dropped) text = dropped.trim();
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		const words = text.trim();
		if ((!words && !image) || saving) return;
		saving = true;
		const body = image
			? {
					captureType: 'screenshot',
					image: image.base64,
					mime: 'image/jpeg',
					note: words || undefined
				}
			: /^https?:\/\/\S+$/i.test(words)
				? { captureType: 'url', sourceUrl: words }
				: { captureType: 'note', note: words };
		try {
			const { item } = await api<{ item: Item }>('/api/items', 'POST', body);
			fresh[item.id] = { preview: image?.preview, reading: true };
			items = [item, ...(items ?? []).filter((i) => i.id !== item.id)];
			toast = { item, preview: image?.preview, left: 6000 };
			text = '';
			image = null;
			watch(item.id);
			void refreshShell();
		} catch (err) {
			failed(err);
		} finally {
			saving = false;
		}
	}

	async function watch(id: string) {
		for (let tries = 0; tries < 40; tries++) {
			await new Promise((r) => setTimeout(r, tries < 5 ? 2500 : 5000));
			if (!fresh[id]) return;
			try {
				const res = await api<{ item: Item; analysis: unknown }>(`/api/items/${id}`);
				items = (items ?? []).map((i) => (i.id === id ? res.item : i));
				if (res.analysis || res.item.analysisError) break;
			} catch {
				// keep waiting
			}
		}
		if (fresh[id]) fresh[id] = { ...fresh[id], reading: false };
	}

	function openThing(id: string, e: MouseEvent) {
		open = {
			id,
			origin: (e.currentTarget as HTMLElement).getBoundingClientRect(),
			sorting: false
		};
	}
	function startSort() {
		const next = queue[0];
		if (next) open = { id: next, origin: null, sorting: true };
	}
	function decided(id: string, decision: 'keep' | 'later' | 'let_go') {
		const status = decision === 'keep' ? 'shortlist' : decision === 'let_go' ? 'archived' : 'ready';
		items = (items ?? []).map((i) => (i.id === id ? { ...i, status } : i));
		if (decision === 'later') skipped = [...skipped, id];
		const next = queue.find((q) => q !== id);
		open = open?.sorting && next ? { id: next, origin: null, sorting: true } : null;
	}
	function changed(updated: { id: string; intent: string }) {
		items = (items ?? []).map((i) => (i.id === updated.id ? { ...i, intent: updated.intent } : i));
	}

	function plusClicked(e: MouseEvent) {
		if (text.trim() || image) return; // the form submits and saves
		e.preventDefault();
		panelOpen = !panelOpen;
	}
	function want() {
		panelOpen = false;
		if (!text.trim()) text = 'I want to ';
		requestAnimationFrame(() => {
			input?.focus();
			input?.setSelectionRange(text.length, text.length);
		});
	}
	function pickImage() {
		panelOpen = false;
		fileInput?.click();
	}
	function voiceSaved(saved: Item[]) {
		for (const item of saved) {
			fresh[item.id] = { reading: true };
			watch(item.id);
		}
		items = [...saved, ...(items ?? [])];
		toast = { item: saved[0], left: 6000 };
		void refreshShell();
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (panelOpen) panelOpen = false;
			else if (group && !open) group = null;
		}
	}

	async function undo(id: string) {
		toast = null;
		try {
			await api(`/api/items/${id}`, 'DELETE');
			delete fresh[id];
			items = (items ?? []).filter((i) => i.id !== id);
		} catch (e) {
			failed(e);
		}
	}
	async function keepAsReference(id: string) {
		toast = null;
		try {
			const res = await api<{ item?: Item }>(`/api/items/${id}/reference`, 'PUT', {
				reference: true
			});
			const updated = res?.item;
			if (updated) items = (items ?? []).map((i) => (i.id === id ? updated : i));
		} catch (e) {
			failed(e);
		}
	}
</script>

<svelte:head>
	<title>Inbox · createthings</title>
</svelte:head>

<svelte:window onpaste={onPaste} onkeydown={onKeydown} />

{#snippet mini(item: Item, i: number)}
	<span class="mini cut" style:--i={i}
		><img src={fresh[item.id]?.preview ?? coverFor(item.id, 300)} alt="" loading="lazy" /></span
	>
{/snippet}

<div class="stage" ondragover={(e) => e.preventDefault()} ondrop={onDrop} role="presentation">
	<!-- Capture: at the top of the page, above the canvas -->
	<div class="top">
		<form class="capture" onsubmit={save}>
			{#if image}
				<button
					type="button"
					class="thumb"
					aria-label="Remove the image"
					onclick={() => (image = null)}
				>
					<img src={image.preview} alt="" />
				</button>
			{/if}
			<label class="sr-only" for="capture">What do you want to make, learn or try?</label>
			<input
				id="capture"
				bind:this={input}
				bind:value={text}
				placeholder="What do you want to make, learn or try?"
				autocomplete="off"
				maxlength="10000"
			/>
			<button
				class="plus"
				class:open={panelOpen && !text.trim() && !image}
				disabled={saving}
				aria-label={text.trim() || image ? 'Save' : 'More ways to add'}
				aria-expanded={text.trim() || image ? undefined : panelOpen}
				onclick={plusClicked}>+</button
			>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				hidden
				onchange={(e) => {
					const f = e.currentTarget.files?.[0];
					if (f) readImage(f);
					e.currentTarget.value = '';
				}}
			/>
		</form>
		{#if panelOpen}
			<div class="panel-catch" role="presentation" onclick={() => (panelOpen = false)}></div>
			<div class="panel-pos">
				<CapturePanel
					onimage={pickImage}
					onwant={want}
					onsaved={voiceSaved}
					onclose={() => (panelOpen = false)}
				/>
			</div>
		{/if}
	</div>

	<!-- Design 10: the framed canvas -->
	<section class="frame" aria-label="Your things">
		{#if opened}
			<!-- A group, opened in place: 16B -->
			<div class="opened" in:rise={{ y: 10, scale: 0.98, duration: 240 }}>
				<div class="opened-head">
					<button class="back" onclick={() => (group = null)}>← All</button>
					<div class="opened-title">
						<span class="headline">{opened.label}</span>
						<span class="count">{opened.things.length} {plural(opened.things.length)}</span>
					</div>
				</div>
				<div class="fan">
					{#each opened.things as item, n (item.id)}
						{@const f = fresh[item.id]}
						<button
							class="fan-card"
							style:--r="{[-3, 1, -1.5, 2.5][n % 4]}deg"
							onclick={(e) => openThing(item.id, e)}
							in:rise={{ y: 8, scale: 0.96, delay: reduce ? 0 : Math.min(n * 40, 320) }}
						>
							<img
								class="fan-img"
								src={f?.preview ?? coverFor(item.id, 400)}
								alt=""
								loading="lazy"
							/>
							{#if item.captureType === 'note'}
								<span class="fan-note">{item.note ?? item.title}</span>
							{:else}
								<span class="fan-title">{item.title}</span>
							{/if}
							<span class="small"
								>{f?.reading
									? 'analysing…'
									: [hostOf(item.sourceUrl), statusWord(item.status)]
											.filter(Boolean)
											.join(' · ')}</span
							>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<!-- The map: groups gathered around the centre -->
			<div
				class="map"
				class:panning
				role="presentation"
				bind:this={mapEl}
				style:translate="{pan.x}px {pan.y}px"
				onpointerdown={panDown}
				onpointermove={panMove}
				onpointerup={panUp}
				onpointercancel={panUp}
				in:rise={{ y: 8, duration: 220 }}
			>
				<div class="centre">
					{#if problem}
						<div class="label">Something went wrong</div>
						<div class="sub">{problem}</div>
						<button class="btn-ink" onclick={load}>Try again</button>
					{:else if items === null}
						<div class="label">Inbox</div>
						<div class="headline">…</div>
					{:else}
						<div class="label">Inbox</div>
						<div class="headline">{newCount} new {plural(newCount)}.</div>
						<div class="sub">
							{newCount
								? 'One at a time, they take about two minutes.'
								: 'Save something above to start.'}
						</div>
						{#if toSort}
							<button class="btn-ink" onclick={startSort}>Sort them</button>
						{/if}
					{/if}
				</div>

				{#each groups as g, i (g.id)}
					<button
						class="place"
						class:lifted={dragging === g.id}
						style:grid-area={SLOTS[i]}
						style:translate="{moved[g.id]?.x ?? 0}px {moved[g.id]?.y ?? 0}px"
						onpointerdown={(e) => placeDown(e, g.id)}
						onpointermove={placeMove}
						onpointerup={() => placeUp(g.id)}
						onkeydown={(e) => e.key === 'Enter' && (group = g.id)}
						aria-label="{g.label}: {g.things.length} {plural(g.things.length)}. Open"
						in:rise={{ y: 8, scale: 0.96, delay: reduce ? 0 : 60 + i * 50 }}
					>
						<span class="tag"><i>{g.label}</i><span class="tag-n">{g.things.length}</span></span>
						<span class="stack">
							{#each g.things.slice(0, 3) as item, k (item.id)}
								{@render mini(item, k)}
							{/each}
						</span>
					</button>
				{/each}
			</div>
			{#if Object.keys(moved).length || pan.x || pan.y}
				<button class="reset" onclick={resetLayout}>Reset layout</button>
			{/if}
		{/if}
	</section>
</div>

{#if open}
	<ItemSheet
		itemId={open.id}
		origin={open.origin}
		preview={fresh[open.id]?.preview}
		{statusWord}
		pet={petForSheet}
		onclose={() => (open = null)}
		ondecided={decided}
		onchanged={changed}
		onerror={failed}
		onstarted={(id) =>
			(items = (items ?? []).map((i) => (i.id === id ? { ...i, status: 'focus' } : i)))}
	/>
{/if}

<!-- Section 11: save toast -->
{#if toast}
	<div
		class="toast"
		role="status"
		in:rise={{ y: -10, scale: 0.98, duration: 220 }}
		out:rise={{ y: -10, scale: 0.98, duration: 160 }}
		onmouseenter={() => (toastHover = true)}
		onmouseleave={() => (toastHover = false)}
	>
		<div class="toast-top">
			{#if toast.preview}
				<img class="toast-thumb" src={toast.preview} alt="" />
			{:else}
				<img class="toast-thumb" src={coverFor(toast.item.id, 200)} alt="" />
			{/if}
			<div class="toast-text">
				<div class="toast-title">{toast.item.title}</div>
				<div class="toast-meta">
					{[
						hostOf(toast.item.sourceUrl),
						toast.item.captureType === 'note'
							? 'Note'
							: toast.item.captureType === 'url'
								? 'Link'
								: 'Image'
					]
						.filter(Boolean)
						.join(' · ')}
				</div>
			</div>
		</div>
		<div class="toast-actions">
			<span class="strong">Saved.</span>
			<button onclick={() => toast && keepAsReference(toast.item.id)}
				>Keep as reference instead</button
			>
			<span class="sep">·</span>
			<button onclick={() => toast && undo(toast.item.id)}>Undo</button>
			<span class="sep">·</span>
			<a class="see" href={resolve(`/things/${toast.item.id}`)}>See it</a>
		</div>
		<div class="toast-bar"><div style:width="{(toast.left / 6000) * 100}%"></div></div>
	</div>
{/if}

<style>
	/* The frame sits in the middle of the space under the strip. */
	.stage {
		min-height: calc(100svh - var(--strip-h, 0px));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 24px 16px;
		color: #1b1a17;
		font-family: 'Geist', sans-serif;
	}
	/* Design 10 canvas frame: paper, dot grid, radius 24, 1px line. */
	.frame {
		position: relative;
		width: min(1100px, 70vw);
		height: min(760px, max(480px, calc((100svh - var(--strip-h, 0px)) * 0.78 - 60px)));
		border-radius: 24px;
		background-color: #f6f4ef;
		background-image: radial-gradient(#ddd8cd 1px, transparent 1px);
		background-size: 22px 22px;
		box-shadow:
			inset 0 0 0 1px #e4e0d7,
			var(--dusty-edge, 0 0 0 transparent),
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 18px 24px 28px;
		overflow: hidden;
	}

	/* The capture bar, top of the page, above the canvas. */
	.top {
		position: relative;
		width: min(560px, 92%);
		z-index: 25;
	}
	.capture {
		flex: none;
		display: flex;
		align-items: center;
		gap: 10px;
		height: 40px;
		padding: 0 6px 0 16px;
		width: 100%;
		height: 44px;
		background: #fff;
		border-radius: 999px;
		box-shadow:
			0 0 0 1px #e4e0d7,
			0 1px 2px rgba(27, 26, 23, 0.04);
		z-index: 3;
	}
	.capture:focus-within {
		box-shadow:
			0 0 0 2px #1b1a17,
			0 1px 2px rgba(27, 26, 23, 0.04);
	}
	.capture input {
		flex: 1;
		min-width: 0;
		height: 36px;
		background: transparent;
		outline: none;
		font-size: 13px;
		color: #1b1a17;
	}
	/* The ring goes on the whole rounded bar (.capture:focus-within), never a box inside it. */
	.capture input:focus,
	.capture input:focus-visible {
		outline: none;
	}
	.capture input::placeholder {
		color: #5f5a52;
	}
	.plus {
		width: 28px;
		height: 28px;
		flex: none;
		border-radius: 50%;
		background: #1b1a17;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		transition-property: transform;
		transition-duration: 160ms;
		transition-timing-function: var(--ease-out);
	}
	.plus.open {
		transform: rotate(45deg);
	}
	.plus:active {
		transform: scale(0.96);
	}
	.plus.open:active {
		transform: rotate(45deg) scale(0.96);
	}
	.thumb img {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		object-fit: cover;
		outline: 1px solid oklch(0 0 0 / 0.1);
	}
	.panel-catch {
		position: fixed;
		inset: 0;
		z-index: 24;
	}
	.panel-pos :global(.panel) {
		position: absolute;
		top: 52px;
	}

	/* The map: one 3 × 3 grid in the middle; the centre holds the next step. */
	.map {
		cursor: grab;
		transition-property: translate;
		transition-duration: 0ms;
		flex: 1;
		width: 100%;
		max-width: 860px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		grid-template-rows: repeat(3, minmax(0, 1fr));
		align-items: center;
		justify-items: center;
		gap: 8px 16px;
		padding-top: 12px;
	}
	.centre {
		grid-area: 2 / 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
	}
	.label {
		font-size: 12px;
		color: #5f5a52;
	}
	.headline {
		font-family: 'Instrument Serif', serif;
		font-size: clamp(32px, 3.4vw, 44px);
		line-height: 1;
	}
	.sub {
		font-size: 13px;
		color: #57534b;
		max-width: 28ch;
	}
	.btn-ink {
		height: 34px;
		padding: 0 18px;
		border-radius: 999px;
		background: #1b1a17;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
		transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
	.btn-ink:active {
		scale: 0.96;
	}

	.map.panning {
		cursor: grabbing;
		user-select: none;
	}
	@media (min-width: 721px) {
		.map {
			touch-action: none;
		}
	}
	/* A place: its italic label above a small stack of what's in it. */
	.place {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		transition-property: transform;
		transition-duration: 240ms;
		transition-timing-function: var(--ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.place:hover {
			transform: translateY(-3px);
		}
		.place:hover .mini {
			transform: rotate(0deg) translateX(calc((var(--i) - 1) * 26px));
		}
	}
	.place {
		touch-action: none;
		user-select: none;
		cursor: grab;
	}
	.place:active {
		transform: scale(0.96);
	}
	/* While dragged: lifts and follows the pointer with no lag. */
	.place.lifted {
		z-index: 5;
		cursor: grabbing;
		transform: scale(1.04);
	}
	.place.lifted .tag {
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.reset {
		position: absolute;
		inset-inline-end: 20px;
		bottom: 14px;
		font-size: 11px;
		color: #57534b;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.tag {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 5px 10px;
		background: #fff;
		border-radius: 8px;
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
		font-family: 'Instrument Serif', serif;
		font-size: 17px;
		color: #1b1a17;
	}
	.tag-n {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: #5f5a52;
	}
	.stack {
		position: relative;
		width: 150px;
		height: 96px;
	}
	/* Section 10 objects, small: a cutout, a link card, a note card. */
	.mini {
		position: absolute;
		inset-inline-start: 50%;
		top: 50%;
		width: 96px;
		height: 72px;
		margin: -36px 0 0 -48px;
		border-radius: 10px;
		overflow: hidden;
		transform: rotate(calc((var(--i) - 1) * 6deg)) translateX(calc((var(--i) - 1) * 14px));
		transition-property: transform;
		transition-duration: 240ms;
		transition-timing-function: var(--ease-out);
		z-index: calc(3 - var(--i));
	}
	.mini.cut {
		filter: drop-shadow(0 10px 14px rgba(27, 26, 23, 0.12));
	}
	.mini.cut img,
	.fan-img,
	.toast-thumb {
		outline: 1px solid oklch(0 0 0 / 0.1);
		outline-offset: -1px;
	}
	.mini.cut img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* A group opened in place (16B). */
	.opened {
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-top: 24px;
		min-height: 0;
	}
	.opened-head {
		display: flex;
		align-items: flex-end;
		gap: 16px;
	}
	.back {
		height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 12px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.back:active {
		scale: 0.96;
	}
	.opened-title {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.count {
		font-size: 12px;
		color: #5f5a52;
	}
	.fan {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		padding: 10px 0 10px 40px;
		row-gap: 24px;
	}
	.fan-card {
		position: relative;
		width: 150px;
		height: 210px;
		margin-inline-start: -40px;
		border-radius: 18px;
		background: #fff;
		box-shadow: 0 12px 30px rgba(27, 26, 23, 0.12);
		transform: rotate(var(--r));
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 4px;
		padding: 14px;
		text-align: start;
		overflow: hidden;
		transition-property: transform, box-shadow;
		transition-duration: 240ms;
		transition-timing-function: var(--ease-out);
	}
	.fan-card:is(:hover, :focus-visible) {
		z-index: 1;
		transform: rotate(0deg) translateY(-8px);
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	.fan-img {
		position: absolute;
		inset: 0 0 auto 0;
		height: 120px;
		width: 100%;
		object-fit: cover;
	}
	.fan-title {
		font-size: 13px;
		font-weight: 600;
		line-height: 1.25;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.fan-note {
		font-size: 13px;
		line-height: 1.35;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.small {
		font-size: 11px;
		color: #5f5a52;
	}

	/* Section 11: save toast. */
	.toast {
		position: fixed;
		z-index: 20;
		top: calc(var(--strip-h, 0px) + 16px);
		left: 50%;
		translate: -50% 0;
		width: min(336px, calc(100% - 24px));
		border-radius: 16px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: rgba(255, 255, 255, 0.68);
		backdrop-filter: blur(18px) saturate(1.4);
		-webkit-backdrop-filter: blur(18px) saturate(1.4);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.8),
			0 0 0 1px rgba(27, 26, 23, 0.06),
			0 16px 40px rgba(27, 26, 23, 0.18);
	}
	.toast-top {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.toast-thumb {
		width: 56px;
		height: 56px;
		flex: none;
		border-radius: 10px;
		object-fit: cover;
		background: repeating-linear-gradient(135deg, #ece8e0 0 6px, #f3f0ea 6px 12px);
		box-shadow: 0 0 0 1px rgba(27, 26, 23, 0.08);
	}
	.toast-text {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.toast-title {
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.toast-meta {
		font-size: 11px;
		color: #57534b;
	}
	.toast-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 12px;
	}
	.see {
		font-weight: 600;
		text-decoration: underline;
	}
	.toast-actions button {
		color: #1b1a17;
		text-decoration: underline;
	}
	.strong {
		font-weight: 600;
	}
	.sep {
		color: #6b665e;
	}
	.toast-bar {
		height: 3px;
		border-radius: 999px;
		background: rgba(27, 26, 23, 0.08);
		overflow: hidden;
	}
	.toast-bar div {
		height: 100%;
		background: #1b1a17;
	}

	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 3px;
	}

	/* Phones: the frame fills the width and grows with its content; groups in two columns. */
	@media (max-width: 720px) {
		.stage {
			place-items: start center;
			padding: 12px;
		}
		.frame {
			width: 100%;
			height: auto;
			min-height: calc(100svh - var(--strip-h, 0px) - 24px);
			padding: 14px 12px 24px;
		}
		.capture {
			width: 100%;
		}
		.map {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: none;
			gap: 28px 12px;
			padding-top: 28px;
		}
		.centre {
			grid-area: auto;
			grid-column: 1 / -1;
			margin-bottom: 8px;
		}
		.place {
			grid-area: auto !important;
		}
		.fan {
			padding-inline-start: 0;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px 12px;
		}
		.fan-card {
			width: 100%;
			margin-inline-start: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.place,
		.mini,
		.fan-card,
		.plus {
			transition: none;
		}
	}
</style>
