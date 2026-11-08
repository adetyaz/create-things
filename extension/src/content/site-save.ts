/**
 * Save buttons on the sites in the site saver registry: a small ＋ on each post, and a "Save to
 * createthings" button on a single thing's page. Click saves; Alt-click keeps it as a reference.
 * Only the clicked post is read; nothing is collected in the background.
 */
import { saverFor } from '../sites/registry';
import type { SiteSave } from '../sites/types';

const MARK = 'data-createthings';
const saver = saverFor(location.hostname);

async function send(
	save: SiteSave,
	asReference: boolean
): Promise<{ ok: boolean; error?: string }> {
	const res = await chrome.runtime.sendMessage({ type: 'SAVE_SITE', save, asReference });
	return { ok: res?.success === true, error: res?.error };
}

function makeButton(
	label: string,
	style: Partial<CSSStyleDeclaration>,
	read: () => SiteSave | null
) {
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = label;
	button.title = 'Save to createthings (Alt-click: keep as a reference)';
	button.setAttribute('aria-label', 'Save to createthings');
	Object.assign(button.style, {
		cursor: 'pointer',
		fontFamily: 'system-ui, -apple-system, sans-serif',
		...style
	});
	button.addEventListener('click', async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const save = read();
		if (!save) {
			button.title = "Couldn't find what to save here";
			return;
		}
		const before = button.textContent;
		button.textContent = '…';
		const { ok, error } = await send(save, event.altKey);
		button.textContent = ok ? '✓' : '×';
		button.title = ok ? 'Saved to createthings' : `Couldn't save: ${error ?? 'unknown error'}`;
		setTimeout(() => (button.textContent = before), 3000);
	});
	return button;
}

/** A small round ＋ over a post's top-right corner, or inside the saver's slot. */
function addPostButton(post: Element) {
	const posts = saver!.posts!;
	const slot = posts.slot ? posts.slot(post) : post;
	if (!slot || slot.hasAttribute(MARK)) return;
	slot.setAttribute(MARK, '1');
	const inSlot = !!posts.slot;
	const button = makeButton(
		'＋',
		inSlot
			? {
					background: 'none',
					border: 'none',
					color: 'rgb(113, 118, 123)',
					fontSize: '16px',
					padding: '0 8px'
				}
			: {
					position: 'absolute',
					top: '8px',
					right: '8px',
					zIndex: '10',
					width: '28px',
					height: '28px',
					borderRadius: '50%',
					border: 'none',
					background: 'rgba(17, 24, 39, 0.75)',
					color: '#fff',
					fontSize: '15px',
					lineHeight: '28px',
					padding: '0'
				},
		() => posts.read(post)
	);
	if (!inSlot && getComputedStyle(post).position === 'static') {
		(post as HTMLElement).style.position = 'relative';
	}
	slot.appendChild(button);
}

let pageButton: HTMLButtonElement | null = null;

/** One button on a single thing's page; follows in-page navigation (YouTube, GitHub). */
function syncPageButton() {
	const page = saver!.page;
	const wanted = !!page && page.matches(new URL(location.href));
	if (wanted && !pageButton) {
		pageButton = makeButton(
			'＋ Save to createthings',
			{
				position: 'fixed',
				left: '16px',
				bottom: '16px',
				zIndex: '2147483646',
				border: '1px solid #e5e7eb',
				borderRadius: '999px',
				background: '#ffffff',
				color: '#111827',
				boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
				fontSize: '12px',
				fontWeight: '600',
				padding: '7px 12px'
			},
			() => page!.read()
		);
		document.body.appendChild(pageButton);
	} else if (!wanted && pageButton) {
		pageButton.remove();
		pageButton = null;
	}
}

function scan() {
	if (saver?.posts) document.querySelectorAll(saver.posts.selector).forEach(addPostButton);
	if (saver?.page) syncPageButton();
}

if (saver) {
	scan();
	let queued = false;
	new MutationObserver(() => {
		// Feeds change constantly; scan at most once a frame.
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			scan();
		});
	}).observe(document.body, { childList: true, subtree: true });
}

// Copy as you go: when the site's own save button is pressed (X's Bookmark, Pinterest's Save), the
// worker saves the post here too, if the user switched copying on for this site.
if (saver?.copy) {
	const copy = saver.copy;
	document.addEventListener(
		'click',
		(event) => {
			const button = (event.target as Element | null)?.closest?.(copy.trigger);
			if (!button) return;
			const post = copy.postOf(button);
			const save =
				post && post !== document.body && saver.posts
					? saver.posts.read(post)
					: (saver.page?.read() ?? null);
			if (save) void chrome.runtime.sendMessage({ type: 'COPY_SITE', site: saver.id, save });
		},
		// Capture phase: read the post before the site re-renders it.
		true
	);
}
