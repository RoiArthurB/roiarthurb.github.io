import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { AP_ACTOR_URL, AP_BASE_URL, AP_OUTBOX_URL } from '../../utils/activitypub';

export const GET: APIRoute = async () => {
	const posts = (await getCollection('blog')).filter((post) => post.data.publish === true);
	// Sort by pubDate descending (newest first)
	posts.sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());

	const orderedItems = posts.map((post) => {
		const postUrl = `${AP_BASE_URL}/blog/${post.id}/`;
		const objectUrl = `${AP_BASE_URL}/activitypub/blog/${post.id}.json`;
		const published = new Date(post.data.pubDate).toISOString();

		return {
			id: `${objectUrl}/create`,
			type: 'Create',
			actor: AP_ACTOR_URL,
			published,
			to: ['https://www.w3.org/ns/activitystreams#Public'],
			object: {
				id: objectUrl,
				type: 'Article',
				attributedTo: AP_ACTOR_URL,
				name: post.data.title,
				summary: post.data.description,
				url: postUrl,
				published,
				updated: post.data.updatedDate ? new Date(post.data.updatedDate).toISOString() : undefined,
				to: ['https://www.w3.org/ns/activitystreams#Public'],
			},
		};
	});

	const outbox = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: AP_OUTBOX_URL,
		type: 'OrderedCollection',
		totalItems: orderedItems.length,
		orderedItems,
	};

	return new Response(JSON.stringify(outbox), {
		headers: {
			'Content-Type': 'application/activity+json',
		},
	});
};
