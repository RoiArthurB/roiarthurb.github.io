import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { AP_ACTOR_URL, AP_BASE_URL } from '../../../utils/activitypub';

export async function getStaticPaths() {
	const posts = (await getCollection('blog')).filter((post) => post.data.publish === true);
	return posts.map((post) => ({
		params: { slug: post.id },
	}));
}

export const GET: APIRoute = async ({ params }) => {
	const posts = await getCollection('blog');
	const post = posts.find((p) => p.id === params.slug);

	if (!post) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const postUrl = `${AP_BASE_URL}/blog/${post.id}/`;
	const objectUrl = `${AP_BASE_URL}/activitypub/blog/${post.id}.json`;
	const published = new Date(post.data.pubDate).toISOString();

	const article = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: objectUrl,
		type: 'Article',
		attributedTo: AP_ACTOR_URL,
		name: post.data.title,
		summary: post.data.description,
		url: postUrl,
		published,
		updated: post.data.updatedDate ? new Date(post.data.updatedDate).toISOString() : undefined,
		to: ['https://www.w3.org/ns/activitystreams#Public'],
	};

	return new Response(JSON.stringify(article), {
		headers: {
			'Content-Type': 'application/activity+json',
		},
	});
};
