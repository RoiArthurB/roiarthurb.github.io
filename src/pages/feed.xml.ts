import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import authorsData from '../data/authors.json';
import { url } from '../utils/paths';

const md = new MarkdownIt();

const escapeXml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

// Wrap rendered HTML in CDATA, splitting any literal `]]>` a code block might contain.
const cdata = (html: string) => `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export const GET: APIRoute = async ({ site, request }) => {
	const origin = site ?? new URL(request.url);
	const absolute = (path: string) => new URL(url(path), origin).href;

	const posts = (await getCollection('blog')).filter((post) => post.data.publish === true);
	// Sort by pubDate descending (newest first)
	posts.sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());

	const authorFor = (id: string) => authorsData.find((author) => author.id === id);

	const entries = posts.map((post) => {
		const link = absolute(`/blog/${post.id}/`);
		const published = new Date(post.data.pubDate).toISOString();
		const updated = new Date(post.data.updatedDate ?? post.data.pubDate).toISOString();

		const authors = (post.data.authors ?? [])
			.map(authorFor)
			.filter((author): author is NonNullable<typeof author> => author !== undefined);
		const authorTags = (
			authors.length > 0
				? authors.map((author) => ({ name: author.name, uri: author.website }))
				: [{ name: SITE_TITLE, uri: origin.href }]
		).map(
			({ name, uri }) =>
				`\t\t<author><name>${escapeXml(name)}</name>${uri ? `<uri>${escapeXml(uri)}</uri>` : ''}</author>`,
		);

		const categories = (post.data.tags ?? []).map(
			(tag) => `\t\t<category term="${escapeXml(tag)}" />`,
		);

		return [
			'\t<entry>',
			`\t\t<id>${escapeXml(link)}</id>`,
			`\t\t<title>${escapeXml(post.data.title)}</title>`,
			`\t\t<link rel="alternate" type="text/html" href="${escapeXml(link)}" />`,
			`\t\t<published>${published}</published>`,
			`\t\t<updated>${updated}</updated>`,
			...authorTags,
			...categories,
			`\t\t<summary type="html">${escapeXml(post.data.description)}</summary>`,
			`\t\t<content type="html">${cdata(md.render(post.body ?? ''))}</content>`,
			'\t</entry>',
		].join('\n');
	});

	const feedUpdated =
		posts.length > 0
			? new Date(posts[0].data.updatedDate ?? posts[0].data.pubDate).toISOString()
			: new Date().toISOString();

	const feed = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<feed xmlns="http://www.w3.org/2005/Atom">',
		`\t<id>${escapeXml(absolute('/'))}</id>`,
		`\t<title>${escapeXml(SITE_TITLE)}</title>`,
		`\t<subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>`,
		`\t<updated>${feedUpdated}</updated>`,
		`\t<link rel="self" type="application/atom+xml" href="${escapeXml(absolute('/feed.xml'))}" />`,
		`\t<link rel="alternate" type="text/html" href="${escapeXml(absolute('/'))}" />`,
		`\t<author><name>${escapeXml(SITE_TITLE)}</name></author>`,
		...entries,
		'</feed>',
	].join('\n');

	return new Response(feed, {
		headers: {
			'Content-Type': 'application/atom+xml; charset=utf-8',
		},
	});
};
