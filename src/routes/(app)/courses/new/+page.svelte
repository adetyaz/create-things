<script lang="ts">
	import { resolve } from '$app/paths';
	import { api, ApiError } from '$lib/api';
	import { rise } from '$lib/motion';
	import { refreshShell } from '$lib/shell.svelte';

	/**
	 * Add a course: upload the syllabus (a PDF, or photos / screenshots of it). The pet reads it once
	 * (3 credits) into units in order; starting the course then plans along those units.
	 * POST /api/courses { files: [{ mime, data }], title?, note? }.
	 */

	const COURSE_COST = 3;
	const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';
	const MAX_BYTES = 6 * 1024 * 1024;

	type Unit = { title: string; topics: string[]; date: string | null };
	type Picked = { name: string; mime: string; data: string; size: number };

	let files = $state<Picked[]>([]);
	let title = $state('');
	let note = $state('');
	let busy = $state(false);
	let problem = $state<string | null>(null);
	let result = $state<{ id: string; title: string; units: Unit[] } | null>(null);
	let dragging = $state(false);

	const readable = (n: number) =>
		n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;

	async function add(list: FileList | null | undefined) {
		problem = null;
		for (const file of [...(list ?? [])]) {
			if (!ACCEPT.split(',').includes(file.type)) {
				problem = `${file.name} isn't a PDF or an image.`;
				continue;
			}
			if (file.size > MAX_BYTES) {
				problem = `${file.name} is over 6 MB. Try a smaller file or a photo of each page.`;
				continue;
			}
			if (files.length >= 10) {
				problem = 'Up to 10 files.';
				break;
			}
			const data = await new Promise<string>((done) => {
				const r = new FileReader();
				r.onload = () => done(String(r.result).split(',')[1] ?? '');
				r.readAsDataURL(file);
			});
			files = [...files, { name: file.name, mime: file.type, data, size: file.size }];
		}
	}

	async function read() {
		if (!files.length || busy) return;
		busy = true;
		problem = null;
		try {
			const r = await api<{ item: { id: string; title: string }; units: Unit[] }>(
				'/api/courses',
				'POST',
				{
					files: files.map((f) => ({ mime: f.mime, data: f.data })),
					title: title.trim() || undefined,
					note: note.trim() || undefined
				}
			);
			result = { id: r.item.id, title: r.item.title, units: r.units };
			void refreshShell();
		} catch (e) {
			if (e instanceof ApiError && e.needsSignIn) {
				window.location.assign(`${resolve('/signin')}?next=/courses/new`);
				return;
			}
			problem =
				e instanceof ApiError && e.code === 'out_of_credits'
					? `Reading a syllabus needs ${e.cost ?? COURSE_COST} credits, and today's free ones are used up.`
					: e instanceof Error
						? e.message
						: 'Something went wrong. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Add a course · createthings</title>
</svelte:head>

<main class="page">
	<a class="back" href={resolve('/app')}>← Inbox</a>
	<header class="head">
		<span class="label">Follow a course</span>
		<h1 class="title">Add a course.</h1>
		<p class="lead">
			Upload the syllabus: a PDF, or photos or screenshots of it. Your pet reads it into units in
			order, with class dates when it has them. Starting it then plans small steps along those
			units.
		</p>
	</header>

	{#if result}
		<section class="done" in:rise={{ y: 8, duration: 240 }}>
			<p class="strong">“{result.title}” has {result.units.length} units.</p>
			<ol class="units">
				{#each result.units as u, i (u.title + i)}
					<li>
						<span class="unit-n">{i + 1}</span>
						<span class="unit-text"
							><b>{u.title}</b>{#if u.topics.length}<small>{u.topics.join(' · ')}</small>{/if}</span
						>
						{#if u.date}<span class="mono">{u.date}</span>{/if}
					</li>
				{/each}
			</ol>
			<a class="btn-ink" href={resolve(`/things/${result.id}`)}>Open it and start</a>
		</section>
	{:else}
		<section
			class="drop"
			class:dragging
			role="presentation"
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={(e) => {
				e.preventDefault();
				dragging = false;
				add(e.dataTransfer?.files);
			}}
		>
			<p class="strong">Drop the syllabus here</p>
			<p class="muted">PDF, PNG, JPEG or WebP · up to 10 files · 6 MB each</p>
			<label class="btn-white">
				Choose files
				<input
					type="file"
					accept={ACCEPT}
					multiple
					hidden
					onchange={(e) => {
						add(e.currentTarget.files);
						e.currentTarget.value = '';
					}}
				/>
			</label>
		</section>

		{#if files.length}
			<ul class="files">
				{#each files as f, i (f.name + i)}
					<li>
						<span class="file-name">{f.name}</span>
						<span class="mono">{readable(f.size)}</span>
						<button
							class="remove"
							aria-label="Remove {f.name}"
							onclick={() => (files = files.filter((_, k) => k !== i))}>×</button
						>
					</li>
				{/each}
			</ul>
		{/if}

		<label class="field-label" for="course-title"
			>Course name <span class="muted">optional</span></label
		>
		<input
			id="course-title"
			class="field"
			bind:value={title}
			maxlength="200"
			placeholder="AWS Solutions Architect"
		/>
		<label class="field-label" for="course-note"
			>Anything to know <span class="muted">optional</span></label
		>
		<input
			id="course-note"
			class="field"
			bind:value={note}
			maxlength="2000"
			placeholder="Exam on 14 Dec; classes Tuesdays"
		/>

		{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
		<div class="row">
			<button class="btn-ink" disabled={!files.length || busy} onclick={read}>
				{busy ? 'Reading the syllabus…' : `Read it · ${COURSE_COST} cr`}
			</button>
			{#if busy}<span class="muted">Long syllabuses take up to a minute.</span>{/if}
		</div>
	{/if}
</main>

<style>
	.page {
		max-width: 720px;
		width: calc(100% - 32px);
		margin: 24px auto 48px;
		padding: 24px clamp(16px, 4vw, 40px) 40px;
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
		gap: 14px;
		color: #1b1a17;
	}
	.back {
		align-self: flex-start;
		font-size: 12px;
		color: #57534b;
		padding: 6px 12px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 12px;
		color: #5f5a52;
	}
	.title {
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: 44px;
		line-height: 1;
	}
	.lead {
		font-size: 14px;
		line-height: 1.55;
		color: #57534b;
		max-width: 36rem;
	}
	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 28px 16px;
		border-radius: 16px;
		background: #fff;
		box-shadow: inset 0 0 0 1.5px #e4e0d7;
		text-align: center;
		transition-property: box-shadow;
		transition-duration: 150ms;
	}
	.drop.dragging {
		box-shadow: inset 0 0 0 2px #1b1a17;
	}
	.strong {
		font-size: 15px;
		font-weight: 600;
	}
	.muted {
		font-size: 12px;
		color: #5f5a52;
		font-weight: 400;
	}
	.files {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 28px;
		gap: 10px;
		align-items: center;
		padding: 8px 12px;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
		font-size: 13px;
	}
	.file-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.remove {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		color: #57534b;
	}
	.mono {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: #5f5a52;
	}
	.field-label {
		font-size: 12px;
		color: #5f5a52;
		margin-bottom: -6px;
	}
	.field {
		height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 15px;
		outline: none;
	}
	.field:focus-visible {
		box-shadow: 0 0 0 2px #1b1a17;
	}
	.problem {
		font-size: 13px;
		color: oklch(0.5 0.15 35);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.done {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;
	}
	.units {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.units li {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: baseline;
		padding: 10px 14px;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(27, 26, 23, 0.05);
		font-size: 14px;
	}
	.unit-n {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		color: #5f5a52;
	}
	.unit-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.unit-text small {
		font-size: 12px;
		color: #57534b;
	}
	.btn-ink,
	.btn-white {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 500;
		cursor: pointer;
		transition-property: scale;
		transition-duration: 150ms;
	}
	.btn-ink {
		height: 40px;
		padding: 0 20px;
		background: #1b1a17;
		color: #fff;
		font-size: 14px;
	}
	.btn-white {
		height: 34px;
		padding: 0 16px;
		background: #fff;
		box-shadow: 0 0 0 1px #e4e0d7;
		font-size: 13px;
	}
	.btn-ink:active,
	.btn-white:active {
		scale: 0.96;
	}
	button:disabled {
		opacity: 0.45;
	}
	button:focus-visible,
	a:focus-visible,
	label.btn-white:focus-within {
		outline: 2px solid #1b1a17;
		outline-offset: 2px;
	}
</style>
