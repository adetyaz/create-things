/**
 * Cover photos for saved things that have no image of their own: colourful abstract photos from
 * Pexels (free to use, no attribution required; https://www.pexels.com/license/). Each thing
 * always gets the same cover, picked from its id. Later, collections can choose their own look.
 */
const PEXELS = [
	34802062, 34256516, 40102964, 33838350, 32694153, 33516646, 34964441, 33577500, 6560355, 32634619,
	29915899, 34470316, 34991368, 18859903, 16470356, 30708628
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A cover photo URL for this thing, sized for where it's shown. */
export function coverFor(id: string, width = 400): string {
	const photo = PEXELS[hash(id) % PEXELS.length];
	return `https://images.pexels.com/photos/${photo}/pexels-photo-${photo}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}
