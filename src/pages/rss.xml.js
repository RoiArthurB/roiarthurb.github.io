import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { renderPostHtml } from '../utils/feed';

export async function GET(context) {
	const origin = context.site ?? new URL(context.url);
	const posts = (await getCollection('blog')).filter((post) => post.data.publish === true);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
			content: renderPostHtml(post.body, origin),
		})),
	});
}
