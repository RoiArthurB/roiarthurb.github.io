import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import MarkdownIt from 'markdown-it';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const md = new MarkdownIt();

export async function GET(context) {
	const posts = (await getCollection('blog')).filter((post) => post.data.publish === true);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
			content: md.render(post.body),
		})),
	});
}
