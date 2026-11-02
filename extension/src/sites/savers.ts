/**
 * The sites with a Save button. Each reads only the post that's clicked. Site markup changes now
 * and then; when a selector stops matching, that site simply shows no button until it's updated.
 */
import { bestImage, fromMeta, linkOf, meta, textOf, type SiteSaver } from './types';

export const x: SiteSaver = {
	id: 'x',
	hosts: ['x.com', 'twitter.com'],
	posts: {
		selector: 'article[data-testid="tweet"]',
		// In the action row, next to like and bookmark.
		slot: (post) => post.querySelector('[role="group"]'),
		read: (post) => {
			// The timestamp links to the post itself.
			const url = linkOf(post.querySelector('a[href*="/status/"] time')?.closest('a'));
			return url ? { url, text: textOf(post.querySelector('[data-testid="tweetText"]')) } : null;
		}
	}
};

export const pinterest: SiteSaver = {
	id: 'pinterest',
	hosts: ['pinterest.com'],
	posts: {
		selector: '[data-test-id="pin"]',
		read: (pin) => {
			const url = linkOf(pin.querySelector('a[href*="/pin/"]'));
			const img = pin.querySelector('img');
			return url ? { url, title: img?.alt || undefined, image: bestImage(img) } : null;
		}
	},
	page: {
		matches: (url) => /^\/pin\/\d+/.test(url.pathname),
		read: () => fromMeta()
	}
};

export const arena: SiteSaver = {
	id: 'arena',
	hosts: ['are.na'],
	// Until Are.na is connected (then sync brings blocks in on its own).
	page: {
		matches: (url) => /^\/block\/\d+/.test(url.pathname),
		read: () => fromMeta()
	}
};

export const youtube: SiteSaver = {
	id: 'youtube',
	hosts: ['youtube.com'],
	page: {
		matches: (url) => url.pathname === '/watch' && url.searchParams.has('v'),
		read: () => {
			const id = new URL(location.href).searchParams.get('v');
			if (!id) return null;
			// "Watch from 4:12": the time you're at when you save.
			const at = Math.floor(document.querySelector('video')?.currentTime ?? 0);
			const time = at > 0 ? `${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}` : null;
			return {
				url: `https://www.youtube.com/watch?v=${id}${at > 0 ? `&t=${at}s` : ''}`,
				title: document.title.replace(/ - YouTube$/, ''),
				text: time ? `Watch from ${time}` : undefined
			};
		}
	}
};

export const instagram: SiteSaver = {
	id: 'instagram',
	hosts: ['instagram.com'],
	posts: {
		selector: 'article',
		read: (post) => {
			const url = linkOf(post.querySelector('a[href*="/p/"], a[href*="/reel/"]'));
			// Feed images need the post open, so the feed saves the link and caption.
			return url ? { url, text: textOf(post.querySelector('h1')) } : null;
		}
	},
	page: {
		matches: (url) => /^\/(p|reel)\/[\w-]+/.test(url.pathname),
		read: () => fromMeta()
	}
};

export const dribbble: SiteSaver = {
	id: 'dribbble',
	hosts: ['dribbble.com'],
	posts: {
		selector: 'li[id^="screenshot-"]',
		read: (shot) => {
			const url = linkOf(shot.querySelector('a[href*="/shots/"]'));
			const img = shot.querySelector('img');
			return url
				? {
						url,
						title: img?.alt || undefined,
						text: textOf(shot.querySelector('.user-information .display-name')),
						image: bestImage(img)
					}
				: null;
		}
	},
	page: {
		matches: (url) => /^\/shots\/\d+/.test(url.pathname),
		read: () => fromMeta()
	}
};

export const behance: SiteSaver = {
	id: 'behance',
	hosts: ['behance.net'],
	page: {
		matches: (url) => /^\/gallery\/\d+/.test(url.pathname),
		read: () => fromMeta()
	}
};

export const reddit: SiteSaver = {
	id: 'reddit',
	hosts: ['reddit.com'],
	posts: {
		// New Reddit's post element carries its link and title as attributes.
		selector: 'shreddit-post',
		read: (post) => {
			const permalink = post.getAttribute('permalink');
			const url = permalink ? new URL(permalink, location.origin).toString() : null;
			return url
				? {
						url,
						title: post.getAttribute('post-title') ?? undefined,
						text: textOf(post.querySelector('[slot="text-body"]'))
					}
				: null;
		}
	}
};

/** GitHub paths that look like owner/repo but aren't repos. */
const GITHUB_NOT_REPOS = new Set([
	'settings',
	'orgs',
	'marketplace',
	'explore',
	'topics',
	'notifications',
	'sponsors',
	'features',
	'login',
	'search'
]);

export const github: SiteSaver = {
	id: 'github',
	hosts: ['github.com'],
	page: {
		// The repo's home page: /owner/repo.
		matches: (url) => {
			const parts = url.pathname.split('/').filter(Boolean);
			return parts.length === 2 && !GITHUB_NOT_REPOS.has(parts[0]);
		},
		read: () => {
			const [owner, repo] = location.pathname.split('/').filter(Boolean);
			return {
				url: `https://github.com/${owner}/${repo}`,
				title: `${owner}/${repo}`,
				text: meta('og:description')
			};
		}
	}
};
