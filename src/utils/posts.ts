import { getCollection } from 'astro:content';

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
