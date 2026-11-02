/** Every site saver. Add a site: write it in savers.ts (or its own file), list it here, add its match to manifest.json. */
import type { SiteSaver } from './types';
import {
	arena,
	behance,
	dribbble,
	github,
	instagram,
	pinterest,
	reddit,
	x,
	youtube
} from './savers';

export const SITE_SAVERS: SiteSaver[] = [
	x,
	pinterest,
	arena,
	youtube,
	instagram,
	dribbble,
	behance,
	reddit,
	github
];

/** The saver for this hostname (www. and other subdomains included), if any. */
export function saverFor(hostname: string): SiteSaver | undefined {
	return SITE_SAVERS.find((saver) =>
		saver.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
	);
}
