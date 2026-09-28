import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { renderEntryHtml } from '../utils/feed';
import { getPublishedPosts } from '../utils/posts';

export async function GET(context) {
	const origin = context.site ?? new URL(context.url);
	const posts = await getPublishedPosts();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: post.data.url ?? `/blog/${post.id}/`,
			content: renderEntryHtml(post, origin),
		})),
	});
}
