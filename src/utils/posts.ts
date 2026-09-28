import { type CollectionEntry, getCollection } from 'astro:content';
import { url } from './paths';

/**
 * Every blog post marked `publish: true`, most recent first.
 *
 * Posts without the flag are drafts and stay out of listings and feeds.
 */
export async function getPublishedPosts() {
	const posts = await getCollection('blog');
	return posts
		.filter((post) => post.data.publish === true)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * Where a listing should send the reader.
 *
 * External posts (with a `url`) live on another website and have no local page.
 */
export function postLink(post: CollectionEntry<'blog'>) {
	// Plain `target`/`rel` fields rather than an attribute object: spreading attributes
	// onto an element makes Astro emit a second `class`, which drops the scoped styles.
	return post.data.url
		? { href: post.data.url, external: true, target: '_blank', rel: 'noopener' }
		: { href: url(`/blog/${post.id}/`), external: false, target: undefined, rel: undefined };
}
