/**
 * "Save to createthings" on X posts (x.com / twitter.com): a small button in each post's action
 * row. Click saves the post (its link, with its text as the note); Alt-click keeps it as a reference.
 * Only reads the post the user clicks; nothing is collected in the background.
 */

const MARK = 'data-createthings';

function postLink(article: Element): string | null {
	// The timestamp links to the post itself.
	const time = article.querySelector('a[href*="/status/"] time');
	const href = time?.closest('a')?.getAttribute('href');
	return href ? new URL(href, location.origin).toString() : null;
}

function addButton(article: Element) {
	const actions = article.querySelector('[role="group"]');
	if (!actions || actions.hasAttribute(MARK)) return;
	actions.setAttribute(MARK, '1');

	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = '＋';
	button.title = 'Save to createthings (Alt-click: keep as a reference)';
	button.setAttribute('aria-label', 'Save to createthings');
	Object.assign(button.style, {
		background: 'none',
		border: 'none',
		cursor: 'pointer',
		color: 'rgb(113, 118, 123)',
		fontSize: '16px',
		padding: '0 8px'
	});

	button.addEventListener('click', async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const url = postLink(article);
		if (!url) return;
		const text = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ?? '';
		button.textContent = '…';
		const response = await chrome.runtime.sendMessage({
			type: 'SAVE_POST',
			url,
			text: text.slice(0, 2000),
			asReference: event.altKey
		});
		button.textContent = response?.success ? '✓' : '×';
		button.title = response?.success
			? event.altKey
				? 'Kept as a reference in createthings'
				: 'Saved to createthings'
			: `Couldn't save: ${response?.error ?? 'unknown error'}`;
	});

	actions.appendChild(button);
}

function scan() {
	document.querySelectorAll('article[data-testid="tweet"]').forEach(addButton);
}

scan();
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
