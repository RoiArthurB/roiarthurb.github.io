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
