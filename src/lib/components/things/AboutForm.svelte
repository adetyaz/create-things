<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import { rise } from '$lib/motion';

	/**
	 * "Tell me about it": the questions that matter for this kind of thing, asked before it's
	 * planned, so the plan follows the real course, deadline or rhythm instead of a guess.
	 * Courses can upload the syllabus instead (3 credits). Saving is free.
	 * PUT /api/items/[id]/about, POST /api/courses { files, itemId }.
	 */
	let {
		itemId,
		intent,
		title,
		onsaved,
		onskip
	}: {
		itemId: string;
		intent: string;
		title: string;
		onsaved: () => void;
		onskip: () => void;
	} = $props();

	const HOURS = ['1 hour', '3 hours', '5 hours', '8+ hours'];
	const LEVELS = ['New to it', 'Know some', 'Revising'];

	let courseMode = $state<'type' | 'upload'>('type');
	let link = $state('');
	let units = $state('');
	let date = $state('');
	let hours = $state<string | null>(null);
	let level = $state<string | null>(null);
	let purpose = $state('');
	let done = $state('');
	let know = $state('');
	let often = $state<string | null>(null);
	let when = $state<string | null>(null);
	let keepIf = $state('');
	let files = $state<{ name: string; mime: string; data: string }[]>([]);
	let busy = $state(false);
	let problem = $state<string | null>(null);

	const QUESTION: Record<string, string> = {
		course: 'Tell me about the course',
		make: 'Tell me about what you’re making',
		learn: 'Tell me where you’re starting',
		habit: 'Tell me how often',
		try: 'Tell me what you want from trying it',
		tend: 'Tell me what it needs'
	};

	async function addFiles(list: FileList | null) {
		for (const f of [...(list ?? [])].slice(0, 10)) {
			if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(f.type)) continue;
			const data = await new Promise<string>((ok) => {
				const r = new FileReader();
				r.onload = () => ok(String(r.result).split(',')[1] ?? '');
				r.readAsDataURL(f);
			});
			files = [...files, { name: f.name, mime: f.type, data }];
		}
	}

	function answers(): { q: string; a: string }[] {
		const out: { q: string; a: string }[] = [];
		const add = (q: string, a: string | null) => a && a.trim() && out.push({ q, a: a.trim() });
		add('Link', link);
		add('Hours a week', hours);
		add('Level', level);
		add('What it’s for', purpose);
		add('Already know', know);
		add('How often', often);
		add('When in the day', when);
		add('Would keep it if', keepIf);
		return out;
	}

	async function save() {
		busy = true;
		problem = null;
		try {
			if (intent === 'course' && courseMode === 'upload') {
				if (!files.length) throw new Error('Add the syllabus first: a PDF or photos of it.');
				await api('/api/courses', 'POST', {
					itemId,
					title,
					files: files.map((f) => ({ mime: f.mime, data: f.data })),
					note: [hours && `${hours} a week`, level].filter(Boolean).join(', ') || undefined
				});
			} else {
				const typedUnits = units
					.split('\n')
					.map((u) => u.trim())
					.filter(Boolean);
				await api(`/api/items/${itemId}/about`, 'PUT', {
					goal: (done || keepIf).trim().length >= 3 ? (done || keepIf).trim() : undefined,
					targetDate: date || undefined,
					answers: answers(),
					units: intent === 'course' && typedUnits.length ? typedUnits : undefined
				});
			}
			onsaved();
		} catch (e) {
			problem =
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Reading a syllabus needs ${e.cost ?? 3} credits, and today's free ones are used up. Type the units in instead: it's free.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#snippet chips(options: string[], value: string | null, set: (v: string) => void)}
	<div class="chips">
		{#each options as o (o)}
			<button class="chip" class:on={value === o} aria-pressed={value === o} onclick={() => set(o)}
				>{o}</button
			>
		{/each}
	</div>
{/snippet}

<div class="about" in:rise={{ y: 6, duration: 220 }}>
	<p class="strong">{QUESTION[intent] ?? 'Tell me about it'}</p>
	<p class="muted">
		So the plan fits what you actually need. Takes a minute; skip anything you don't know.
	</p>

	{#if intent === 'course'}
		<div class="tabs" role="tablist">
			<button
				role="tab"
				aria-selected={courseMode === 'type'}
				class:on={courseMode === 'type'}
				onclick={() => (courseMode = 'type')}>Type it in · free</button
			>
			<button
				role="tab"
				aria-selected={courseMode === 'upload'}
				class:on={courseMode === 'upload'}
				onclick={() => (courseMode = 'upload')}>Upload the syllabus · 3 cr</button
			>
		</div>
		{#if courseMode === 'upload'}
			<label class="drop">
				<span
					>{files.length
						? `${files.length} file${files.length > 1 ? 's' : ''}: ${files.map((f) => f.name).join(', ')}`
						: 'Choose the syllabus: a PDF, or photos of it'}</span
				>
				<input
					type="file"
					accept="application/pdf,image/png,image/jpeg,image/webp"
					multiple
					hidden
					onchange={(e) => addFiles(e.currentTarget.files)}
				/>
			</label>
		{:else}
			<label class="q" for="a-link">Link to the course <span class="opt">optional</span></label>
			<input id="a-link" class="field" bind:value={link} placeholder="https://…" />
			<label class="q" for="a-units">What it covers: one unit or topic per line</label>
			<textarea
				id="a-units"
				class="field area"
				bind:value={units}
				rows="4"
				placeholder="Week 1: HTML basics&#10;Week 2: CSS layout&#10;Week 3: JavaScript"
			></textarea>
			<label class="q" for="a-date"
				>When it ends, or your exam date <span class="opt">optional</span></label
			>
			<input id="a-date" class="field" type="date" bind:value={date} />
		{/if}
		<p class="q">Hours a week you can give it</p>
		{@render chips(HOURS, hours, (v) => (hours = v))}
		<p class="q">Where you're starting</p>
		{@render chips(LEVELS, level, (v) => (level = v))}
	{:else if intent === 'make'}
		<label class="q" for="a-purpose">What's it for?</label>
		<input
			id="a-purpose"
			class="field"
			bind:value={purpose}
			placeholder="To show clients my design work"
		/>
		<label class="q" for="a-done">What does “done” look like?</label>
		<input
			id="a-done"
			class="field"
			bind:value={done}
			placeholder="A live site with 4 case studies and a contact page"
		/>
		<label class="q" for="a-date">Deadline <span class="opt">optional</span></label>
		<input id="a-date" class="field" type="date" bind:value={date} />
		<label class="q" for="a-know"
			>What do you already know how to do? <span class="opt">optional</span></label
		>
		<input id="a-know" class="field" bind:value={know} placeholder="Figma, a little HTML" />
		<p class="q">Hours a week you can give it</p>
		{@render chips(HOURS, hours, (v) => (hours = v))}
	{:else if intent === 'learn'}
		<p class="q">Where you're starting</p>
		{@render chips(LEVELS, level, (v) => (level = v))}
		<label class="q" for="a-done">What does “good enough” look like?</label>
		<input
			id="a-done"
			class="field"
			bind:value={done}
			placeholder="Hold a 10-minute conversation"
		/>
		<label class="q" for="a-date">By when <span class="opt">optional</span></label>
		<input id="a-date" class="field" type="date" bind:value={date} />
		<p class="q">Hours a week you can give it</p>
		{@render chips(HOURS, hours, (v) => (hours = v))}
	{:else if intent === 'habit'}
		<p class="q">How often?</p>
		{@render chips(['Every day', '3 times a week', 'Once a week'], often, (v) => (often = v))}
		<p class="q">When in your day?</p>
		{@render chips(
			['Morning', 'Lunch', 'Evening', 'After coffee', 'After work'],
			when,
			(v) => (when = v)
		)}
		<label class="q" for="a-done"
			>What would make it feel like it's working? <span class="opt">optional</span></label
		>
		<input
			id="a-done"
			class="field"
			bind:value={done}
			placeholder="Running 5 km without stopping"
		/>
	{:else if intent === 'try'}
		<label class="q" for="a-keep">What would make you keep it?</label>
		<input
			id="a-keep"
			class="field"
			bind:value={keepIf}
			placeholder="If I still want to after 3 sessions"
		/>
		<p class="q">How much time to give trying it</p>
		{@render chips(['1 hour', '2 hours', 'A weekend'], hours, (v) => (hours = v))}
	{:else}
		<p class="q">How often does it need you?</p>
		{@render chips(['Every day', 'A few times a week', 'Weekly'], often, (v) => (often = v))}
		<label class="q" for="a-purpose"
			>Anything I should know? <span class="opt">optional</span></label
		>
		<input
			id="a-purpose"
			class="field"
			bind:value={purpose}
			placeholder="Tomatoes and basil on a balcony"
		/>
	{/if}

	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
	<div class="row">
		<button class="btn-ink" disabled={busy} onclick={save}>
			{busy
				? intent === 'course' && courseMode === 'upload'
					? 'Reading the syllabus…'
					: 'Saving…'
				: 'Save'}
		</button>
		<button class="btn-quiet" disabled={busy} onclick={onskip}>Skip</button>
	</div>
</div>

<style>
	.about {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}
	.strong {
		font-size: 17px;
		font-weight: 600;
	}
	.muted {
		font-size: 13px;
		line-height: 1.5;
		color: #57534b;
		margin-bottom: 4px;
	}
	.q {
		font-size: 12px;
		color: #5f5a52;
		margin-top: 6px;
	}
	.opt {
		color: #8a847a;
	}
	.field {
		width: 100%;
		height: 42px;
		padding: 0 14px;
		border-radius: 14px;
		background: #f6f4ef;
		box-shadow: inset 0 0 0 1px #e4e0d7;
		font: inherit;
		font-size: 14px;
		color: #1b1a17;
		outline: none;
	}
	.field.area {
		height: auto;
		padding: 10px 14px;
		line-height: 1.5;
		resize: vertical;
	}
	.field:focus-visible {
		box-shadow: inset 0 0 0 2px #1b1a17;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		height: 34px;
		padding: 0 14px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 13px;
		font-weight: 500;
		transition-property: scale, background-color, color;
		transition-duration: 150ms;
	}
	.chip.on {
		background: #1b1a17;
		color: #fff;
		box-shadow: none;
	}
	.chip:active {
		scale: 0.96;
	}
	.tabs {
		align-self: flex-start;
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 3px;
		background: #f6f4ef;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px #e4e0d7;
		font-size: 12px;
	}
	.tabs button {
		padding: 6px 12px;
		border-radius: 999px;
		color: #57534b;
	}
	.tabs button.on {
		background: #1b1a17;
		color: #fff;
		font-weight: 500;
	}
	.drop {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 64px;
		padding: 12px;
		border-radius: 14px;
		background: #f6f4ef;
		box-shadow: inset 0 0 0 1.5px #e4e0d7;
		font-size: 13px;
		color: #57534b;
		text-align: center;
		cursor: pointer;
	}
	.row {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.btn-ink,
	.btn-quiet {
		height: 38px;
		padding: 0 20px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		background: #1b1a17;
		color: #fff;
	}
	.btn-quiet {
		color: #57534b;
	}
	.btn-ink:active,
	.btn-quiet:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.5;
	}
	button:focus-visible {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
</style>
