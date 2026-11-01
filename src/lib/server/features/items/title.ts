/** Page titles can be long ("GitHub - owner/repo: a long description"); memories keep the name. */
export function shortTitle(title: string): string {
	const name = title.split(/: | \| | — /)[0].trim();
	return name.length > 80 ? `${name.slice(0, 77)}...` : name;
}

/** For spotting duplicates: the same title saved twice, ignoring case, spacing and punctuation. */
export function titleKey(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}
