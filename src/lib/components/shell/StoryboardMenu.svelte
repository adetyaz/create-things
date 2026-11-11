<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { api } from '$lib/api';
	import { rise, reduced } from '$lib/motion';

	/**
	 * The storyboard menu: the canvas (design 10) as a map of the app's places. It opens from the
	 * brand pill under the constant strip and never covers it. Each place is a section 10 object
	 * with its live state; drag one to arrange your own storyboard (kept on this device), tap it
	 * to go there. Zones are marked by faint italic labels, as on the canvas.
	 */
	let { onclose }: { onclose: () => void } = $props();

	type PlaceId =
		| 'today'
		| 'plan'
		| 'reviews'
		| 'inbox'
		| 'shortlist'
		| 'journal'
		| 'talk'
		| 'memories'
		| 'course'
		| 'week';
	type Place = { id: PlaceId; title: string; href: string; zone: 'Do' | 'Keep' | 'Care' };

	const PLACES: Place[] = [
		{ id: 'today', title: 'Today', href: '/today', zone: 'Do' },
		{ id: 'plan', title: 'Plan', href: '/plan', zone: 'Do' },
		{ id: 'week', title: 'Plan my week', href: '/plan?week=1', zone: 'Do' },
		{ id: 'reviews', title: 'Reviews', href: '/today?reviews=1', zone: 'Do' },
		{ id: 'inbox', title: 'Inbox', href: '/app', zone: 'Keep' },
		{ id: 'shortlist', title: 'Shortlist', href: '/app?view=shortlist', zone: 'Keep' },
		{ id: 'journal', title: 'Journal', href: '/journal', zone: 'Keep' },
		{ id: 'course', title: 'Add a course', href: '/courses/new', zone: 'Keep' },
		{ id: 'talk', title: 'Talk to your pet', href: '/talk', zone: 'Care' },
		{ id: 'memories', title: 'What it knows', href: '/memories', zone: 'Care' }
	];
	/** Where each place starts (fractions of the board), spread like section 10. */
	const DEFAULT: Record<PlaceId, { x: number; y: number; r: number }> = {
		today: { x: 0.05, y: 0.1, r: -2 },
		plan: { x: 0.24, y: 0.34, r: 3 },
		reviews: { x: 0.07, y: 0.56, r: -4 },
		inbox: { x: 0.56, y: 0.08, r: 2 },
		shortlist: { x: 0.76, y: 0.32, r: -3 },
		journal: { x: 0.58, y: 0.55, r: 4 },
		course: { x: 0.78, y: 0.6, r: -2 },
		week: { x: 0.2, y: 0.78, r: 2 },
		talk: { x: 0.36, y: 0.06, r: 3 },
		memories: { x: 0.4, y: 0.6, r: -3 }
	};
	const KEY = 'ct:storyboard:v1';

	let pos = $state<Record<PlaceId, { x: number; y: number; r: number }>>(structuredClone(DEFAULT));
	let live = $state<Record<PlaceId, string>>({
		today: '…',
		plan: '…',
		reviews: '…',
		inbox: '…',
		shortlist: '…',
		journal: '…',
		course: 'Upload a syllabus · 3 cr',
		week: 'Time blocks for every goal · free',
		talk: "I'm stuck · Teach me · 1 cr",
		memories: 'With proof on Walrus'
	});
	let board = $state<HTMLElement>();
	let dragging = $state<PlaceId | null>(null);
	const reduce = reduced();

	const here = $derived.by(() => {
		const path = page.url.pathname;
		const q = page.url.searchParams;
		if (path.endsWith('/today')) return q.has('reviews') ? 'reviews' : 'today';
		if (path.endsWith('/app')) return q.get('view') === 'shortlist' ? 'shortlist' : 'inbox';
		if (path.endsWith('/plan')) return q.has('week') ? 'week' : 'plan';
		if (path.endsWith('/journal')) return 'journal';
		if (path.endsWith('/talk')) return 'talk';
		if (path.endsWith('/memories')) return 'memories';
		if (path.endsWith('/courses/new')) return 'course';
		return null;
	});

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
			if (saved) pos = { ...pos, ...saved };
		} catch {
			// first time, or storage blocked: the default storyboard
		}
		void loadLive();
	});

	async function loadLive() {
		const [day, items, reviews, journal] = await Promise.all([
			api<{
				blocks: { step: { done: boolean } }[];
				first: { step: { title: string; minutes: number } } | null;
			}>('/api/plan/day').catch(() => null),
			api<{ items: { status: string }[] }>('/api/items').catch(() => null),
			api<{ dueTotal: number }>('/api/reviews').catch(() => null),
			api<{ entries: { createdAt: string }[] }>('/api/journal?limit=1').catch(() => null)
		]);
		if (day) {
			live.today = day.first
				? `#1: ${day.first.step.title} · ${day.first.step.minutes} min`
				: 'Nothing planned yet';
			const done = day.blocks.filter((b) => b.step.done).length;
			live.plan = day.blocks.length
				? `${done} of ${day.blocks.length} today`
				: 'Nothing planned today';
		}
		if (items) {
			const n = (s: string) => items.items.filter((i) => i.status === s).length;
			const fresh = n('inbox') + n('ready');
			live.inbox = fresh
				? `${fresh} new · ${n('ready')} ready to sort`
				: `${items.items.length} saved`;
			live.shortlist = `${n('shortlist')} kept · ${n('focus')} doing`;
		}
		if (reviews) live.reviews = reviews.dueTotal ? `${reviews.dueTotal} due` : 'None due';
		if (journal) {
			const last = journal.entries[0];
			live.journal = last
				? `Last entry ${new Date(last.createdAt).toLocaleDateString(undefined, { weekday: 'short' })}`
				: 'No entries yet';
		}
	}

	// Drag to move; a press that doesn't move is a tap.
	let start = { x: 0, y: 0, px: 0, py: 0, moved: false };
	function down(e: PointerEvent, id: PlaceId) {
		if (e.button !== 0) return;
		start = { x: e.clientX, y: e.clientY, px: pos[id].x, py: pos[id].y, moved: false };
		dragging = id;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging || !board) return;
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
		if (!start.moved && Math.hypot(dx, dy) < 5) return;
		start.moved = true;
		const r = board.getBoundingClientRect();
		pos[dragging] = {
			...pos[dragging],
			x: Math.min(0.82, Math.max(0, start.px + dx / r.width)),
			y: Math.min(0.78, Math.max(0, start.py + dy / r.height))
		};
	}
	function up(id: PlaceId) {
		const wasDrag = start.moved;
		dragging = null;
		if (wasDrag) {
			try {
				localStorage.setItem(KEY, JSON.stringify(pos));
			} catch {
				// storage blocked: the arrangement lasts for this visit
			}
			return;
		}
		const place = PLACES.find((p) => p.id === id)!;
		onclose();
		const [path, query] = place.href.split('?');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the query string is added after
		goto(`${resolve(path as '/today')}${query ? `?${query}` : ''}`);
	}
	function reset() {
		pos = structuredClone(DEFAULT);
		try {
			localStorage.removeItem(KEY);
		} catch {
			// nothing saved
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- 03: the page behind blurs (8px) and dims; the strip above stays clear. -->
<div class="scrim" role="presentation" onclick={onclose}></div>

<div
	id="storyboard"
	class="sheet"
	role="dialog"
	aria-label="Go to"
	in:rise={{ y: -8, scale: 0.97, duration: 240 }}
	out:rise={{ y: -8, scale: 0.97, duration: 160 }}
>
	<div class="board" bind:this={board}>
		<div class="zone-label start">Do</div>
		<div class="zone-label end">Keep</div>
		<div class="zone-label mid">Care</div>

		<!-- Reading order for keyboards and screen readers follows the list, not the positions. -->
		{#each PLACES as place, i (place.id)}
			{@const p = pos[place.id]}
			<button
				class="obj"
				class:here={here === place.id}
				class:lifted={dragging === place.id}
				style:left="{p.x * 100}%"
				style:top="{p.y * 100}%"
				style:--r="{p.r}deg"
				aria-current={here === place.id ? 'page' : undefined}
				aria-label="{place.title}: {live[place.id]}"
				onpointerdown={(e) => down(e, place.id)}
				onpointermove={move}
				onpointerup={() => up(place.id)}
				onkeydown={(e) => e.key === 'Enter' && up(place.id)}
				in:rise={{ scale: 0.95, y: 6, delay: reduce ? 0 : 60 + i * 40 }}
			>
				<span class="obj-title">{place.title}</span>
				<span class="obj-meta">{live[place.id]}</span>
			</button>
		{/each}
	</div>
	<div class="foot">
		<span>Drag to arrange. Tap to go.</span>
		<button class="reset" onclick={reset}>Reset layout</button>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: var(--strip-h, 112px) 0 0 0;
		z-index: 40;
		background: rgba(27, 26, 23, 0.18);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	/* 03: sheet radius 24, open depth. 10: paper with the dot grid. */
	.sheet {
		position: fixed;
		z-index: 41;
		top: calc(var(--strip-h, 112px) + 8px);
		inset-inline-start: 16px;
		width: min(900px, calc(100% - 32px));
		height: min(540px, calc(100svh - var(--strip-h, 112px) - 32px));
		display: flex;
		flex-direction: column;
		border-radius: 24px;
		background-color: #f6f4ef;
		background-image: radial-gradient(#ddd8cd 1px, transparent 1px);
		background-size: 22px 22px;
		transform-origin: top left;
		box-shadow:
			inset 0 0 0 1px #e4e0d7,
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
		overflow: hidden;
	}
	.board {
		position: relative;
		flex: 1;
		margin: 16px;
	}
	/* 10: zone names, faint italic serif, no boxes. */
	.zone-label {
		position: absolute;
		bottom: 0;
		font-family: 'Instrument Serif', serif;
		font-style: italic;
		font-size: clamp(36px, 6vw, 56px);
		line-height: 1;
		color: #8a847a;
		pointer-events: none;
	}
	.zone-label.start {
		inset-inline-start: 4%;
	}
	.zone-label.mid {
		left: 50%;
		translate: -50% 0;
	}
	.zone-label.end {
		inset-inline-end: 4%;
	}
	/* 10: a small white card, tilted, floating. */
	.obj {
		position: absolute;
		width: 170px;
		max-width: 44%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		text-align: start;
		background: #fff;
		border-radius: 14px;
		cursor: grab;
		touch-action: none;
		user-select: none;
		transform: rotate(var(--r));
		box-shadow:
			0 1px 2px rgba(27, 26, 23, 0.04),
			0 8px 24px rgba(27, 26, 23, 0.06);
		transition:
			transform var(--dur-ui) var(--ease-out),
			box-shadow var(--dur-ui) var(--ease-out);
	}
	@media (hover: hover) and (pointer: fine) {
		.obj:hover {
			transform: rotate(0deg) translateY(-2px);
		}
	}
	/* While dragged: lifts to the open depth and straightens. */
	.obj.lifted {
		z-index: 2;
		cursor: grabbing;
		transform: rotate(0deg) scale(1.03);
		transition: box-shadow var(--dur-ui) var(--ease-out);
		box-shadow:
			0 2px 4px rgba(27, 26, 23, 0.04),
			0 24px 60px rgba(27, 26, 23, 0.14);
	}
	/* You are here: the 2px ink ring (04). */
	.obj.here {
		box-shadow:
			0 0 0 2px #1b1a17,
			0 8px 24px rgba(27, 26, 23, 0.06);
	}
	.obj-title {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.obj-meta {
		font-size: 11px;
		line-height: 1.35;
		color: #5f5a52;
		overflow-wrap: anywhere;
	}
	.obj:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 3px;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 0 20px 14px;
		font-size: 11px;
		color: #5f5a52;
	}
	.reset {
		font-size: 11px;
		color: #57534b;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	/* Phones: a sheet from the bottom that leaves the strip in view. */
	@media (max-width: 640px) {
		.sheet {
			top: auto;
			bottom: 0;
			inset-inline: 0;
			width: 100%;
			height: calc(100svh - var(--strip-h, 112px) - 8px);
			border-radius: 24px 24px 0 0;
			padding-bottom: env(safe-area-inset-bottom);
			transform-origin: bottom center;
		}
		.obj {
			width: 150px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.obj,
		.obj.lifted {
			transition: none;
		}
	}
</style>
