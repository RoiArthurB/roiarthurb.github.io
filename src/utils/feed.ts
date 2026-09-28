import type { CollectionEntry } from 'astro:content';
import MarkdownIt from 'markdown-it';
import { url } from './paths';

// `html: true` preserves the raw <figure>/<img> blocks used throughout the posts.
// Without it markdown-it escapes them and subscribers see literal angle brackets.
const md = new MarkdownIt({ html: true });

// Matches root-relative src="/…" / href="/…", but not protocol-relative "//host".
const ROOT_RELATIVE_ATTR = /(\s(?:src|href)=")(\/(?!\/)[^"]*)"/g;

/**
 * Renders a post body to feed-ready HTML.
 *
 * Feed readers don't reliably resolve root-relative paths against the site, so
 * every in-content link and image is rewritten to an absolute URL.
 */
export function renderPostHtml(body: string | undefined, origin: URL): string {
	return md
		.render(body ?? '')
		.replace(
			ROOT_RELATIVE_ATTR,
			(_match, attr: string, path: string) => `${attr}${new URL(url(path), origin).href}"`,
		);
}

/**
 * Feed-ready HTML for any post. External posts have no body, so subscribers get
 * the summary and a link to the real article instead.
 */
export function renderEntryHtml(post: CollectionEntry<'blog'>, origin: URL): string {
	const { url: href, publisher, description } = post.data;
	if (!href) return renderPostHtml(post.body, origin);
	return md.render(`${description}\n\n[Read on ${publisher} ↗](${href})`);
}
