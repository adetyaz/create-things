/**
 * URL metadata scraper using metascraper.
 * Fetches title, author, description, og:image from any URL.
 */

// metascraper doesn't ship TS types — use dynamic import + any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _scraper: any;

async function getScraper() {
	if (_scraper) return _scraper;

	const metascraper = (await import('metascraper')).default;
	const author = (await import('metascraper-author')).default;
	const description = (await import('metascraper-description')).default;
	const image = (await import('metascraper-image')).default;
	const title = (await import('metascraper-title')).default;
	const url = (await import('metascraper-url')).default;

	_scraper = metascraper([author(), description(), image(), title(), url()]);
	return _scraper;
}

export interface UrlMetadata {
	title: string;
	author: string;
	description: string;
	image: string;
	url: string;
}

/** Fetch and extract metadata from a URL. */
export async function scrapeMetadata(targetUrl: string): Promise<UrlMetadata> {
	const response = await fetch(targetUrl, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (compatible; createthings/1.0; +https://createthings.vercel.app)'
		},
		signal: AbortSignal.timeout(10000)
	});

	const html = await response.text();
	const scraper = await getScraper();
	const metadata = await scraper({ html, url: targetUrl });

	return {
		title: metadata.title || '',
		author: metadata.author || '',
		description: metadata.description || '',
		image: metadata.image || '',
		url: metadata.url || targetUrl
	};
}
