/**
 * A site saver: how one site's posts get a Save button, and how to read what's being saved.
 * Adding a site is adding a file in this folder and listing it in registry.ts.
 */

/** What a Save click sends: the link, and the image when the image is the point (pins, shots). */
export interface SiteSave {
	url: string;
	title?: string;
	/** Post text or caption, saved as the note. */
	text?: string;
	/** Image address; the worker downloads it and analysis looks at it. */
	image?: string;
	/** The post's or pin's id on the site, so saving it twice doesn't duplicate it. */
	externalId?: string;
	/** The board or folder it's in, when known (becomes a collection). */
	collection?: string;
}

export interface SiteSaver {
	id: string;
	/** Hostnames it runs on (subdomains included); each also needs a match in manifest.json. */
	hosts: string[];
	/** Posts in a feed or grid that each get a small Save button. */
	posts?: {
		selector: string;
		/** Where the button goes; default: over the post's top-right corner. */
		slot?: (post: Element) => Element | null;
		read: (post: Element) => SiteSave | null;
	};
	/**
	 * Copy as you go: the site's own save button (X's Bookmark, Pinterest's Save). When the user has
	 * switched it on for this site, pressing it also saves the post here.
	 */
	copy?: {
		/** The site's own save button. */
		trigger: string;
		/** The post or pin it belongs to. */
		postOf: (button: Element) => Element | null;
	};
	/**
	 * Bring in what you have: on a page full of saves (X bookmarks, a Pinterest board), an import bar
	 * reads the posts as the page scrolls. Everything comes in as references, not analysed.
	 */
	importer?: {
		matches: (url: URL) => boolean;
		/** The folder or board these belong to (becomes a collection). */
		collection: () => { externalId?: string; title: string };
		/** What the bar calls them ("bookmarks", "pins"). */
		noun: string;
	};
	/** A single thing's own page (a video, a pin, a repo): one Save button at the bottom left. */
	page?: {
		matches: (url: URL) => boolean;
		read: () => SiteSave | null;
	};
}

/** A `<meta property|name>` value from the page. */
export function meta(name: string): string | undefined {
	const el = document.querySelector<HTMLMetaElement>(
		`meta[property="${name}"], meta[name="${name}"]`
	);
	return el?.content?.trim() || undefined;
}

/** What the page says about itself (Open Graph tags), the usual shape for a page-level save. */
export function fromMeta(): SiteSave {
	return {
		url: meta('og:url') ?? location.href,
		title: meta('og:title') ?? document.title,
		text: meta('og:description'),
		image: meta('og:image')
	};
}

/** An absolute link from an element's href. */
export function linkOf(el: Element | null | undefined): string | null {
	const href = el?.getAttribute('href');
	return href ? new URL(href, location.origin).toString() : null;
}

/** The largest image in a srcset (or the src). */
export function bestImage(img: HTMLImageElement | null | undefined): string | undefined {
	if (!img) return undefined;
	const candidates = (img.srcset || '')
		.split(',')
		.map((part) => part.trim().split(/\s+/))
		.filter(([url]) => url)
		.map(([url, size]) => ({ url, size: parseFloat(size) || 0 }));
	candidates.sort((a, b) => b.size - a.size);
	return candidates[0]?.url ?? (img.currentSrc || img.src || undefined);
}

/** Visible text, trimmed and capped (the note's limit is 10,000; posts are short). */
export function textOf(el: Element | null | undefined, max = 2000): string | undefined {
	const text = el?.textContent?.replace(/\s+/g, ' ').trim();
	return text ? text.slice(0, max) : undefined;
}
