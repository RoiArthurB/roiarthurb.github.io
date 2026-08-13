export interface Author {
	first: string;
	last: string;
}

export interface BibEntry {
	type: string;
	key: string;
	fields: Record<string, string>;
	authors: Author[];
}

export function parseBibTeX(input: string): BibEntry[] {
	const entries: BibEntry[] = [];
	const rawEntries = input.split(/@(\w+)\s*\{/g).slice(1);

	for (let i = 0; i < rawEntries.length; i += 2) {
		const type = rawEntries[i].trim();
		const body = rawEntries[i + 1];
		if (!body) continue;

		const keyMatch = body.match(/^\s*([^,]+),/);
		const key = keyMatch ? keyMatch[1].trim() : 'unknown';

		const fields: Record<string, string> = { title: 'Untitled', year: '0000' };
		const fieldRegex = /(\w+)\s*=\s*(?:\{((?:[^{}]|{[^{}]*})*)\}|"((?:[^"]|\\")*)"|(\d+))/g;

		let match;
		while ((match = fieldRegex.exec(body)) !== null) {
			const fieldKey = match[1].toLowerCase();
			const val = match[2] || match[3] || match[4] || '';
			fields[fieldKey] = val.replace(/\s+/g, ' ').trim();
		}

		let authors: Author[] = [];
		if (fields.author) {
			authors = fields.author.split(/\s+and\s+/i).map((str) => {
				const parts = str.split(',');
				if (parts.length > 1) {
					return { first: parts[1].trim(), last: parts[0].trim() };
				}
				const names = str.trim().split(' ');
				const last = names.pop() || '';
				const first = names.join(' ');
				return { first, last };
			});
		}

		entries.push({ type, key, fields, authors });
	}

	return entries;
}

/** Parses a .bib file and returns its entries most-recent first. */
export function parsePublications(input: string): BibEntry[] {
	return parseBibTeX(input).sort(
		(a, b) => (parseInt(b.fields.year) || 0) - (parseInt(a.fields.year) || 0),
	);
}

export const formatAuthor = (auth: Author) =>
	auth.first ? `${auth.first} ${auth.last}` : auth.last;
