import type { APIRoute } from 'astro';
import {
	AP_ACTOR_URL,
	AP_BASE_URL,
	AP_FOLLOWERS_URL,
	AP_FOLLOWING_URL,
	AP_INBOX_URL,
	AP_OUTBOX_URL,
	AP_PUBLIC_KEY_PEM,
	AP_USERNAME,
} from '../../utils/activitypub';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../consts';
import authors from '../../data/authors.json';

export const GET: APIRoute = async () => {
	// Find the primary author (Arthur) for avatar and other details
	const primaryAuthor = authors.find((a) => a.id === 'arthur-brugiere');

	const actor = {
		'@context': [
			'https://www.w3.org/ns/activitystreams',
			'https://w3id.org/security/v1',
		],
		id: AP_ACTOR_URL,
		type: 'Person',
		preferredUsername: AP_USERNAME,
		name: SITE_TITLE,
		summary: SITE_DESCRIPTION,
		url: AP_BASE_URL,
		discoverable: true,
		indexable: true,
		inbox: AP_INBOX_URL,
		outbox: AP_OUTBOX_URL,
		followers: AP_FOLLOWERS_URL,
		following: AP_FOLLOWING_URL,
		icon: primaryAuthor?.avatar
			? {
					type: 'Image',
					mediaType: 'image/png',
					url: primaryAuthor.avatar,
				}
			: undefined,
		publicKey: {
			id: `${AP_ACTOR_URL}#main-key`,
			owner: AP_ACTOR_URL,
			publicKeyPem: AP_PUBLIC_KEY_PEM,
		},
	};

	return new Response(JSON.stringify(actor), {
		headers: {
			'Content-Type': 'application/activity+json',
		},
	});
};
