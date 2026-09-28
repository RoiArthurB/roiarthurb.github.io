import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const TIMEOUT_MS = 10_000;

async function get(url: string) {
	const res = await fetch(url, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; astro-scholar thumbnail fetcher)' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return res;
}

/** Value of `attr` in a single HTML tag, whatever the attribute order. */
const attrOf = (tag: string, attr: string) =>
	tag.match(new RegExp(`\\s${attr}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];

/** First `<meta property|name="…">` content matching one of `keys`, in priority order. */
function findMeta(html: string, keys: string[]) {
	const tags = html.match(/<meta\s[^>]*>/gi) ?? [];
	for (const key of keys) {
		for (const tag of tags) {
			if ((attrOf(tag, 'property') ?? attrOf(tag, 'name'))?.toLowerCase() === key) {
				const content = attrOf(tag, 'content');
				if (content) return content;
			}
		}
	}
}

/** Icon hrefs, biggest-looking first. ICO files are skipped: sharp can't decode them. */
function findIcons(html: string) {
	const tags = html.match(/<link\s[^>]*>/gi) ?? [];
	const icons = tags
		.filter((tag) => /icon/i.test(attrOf(tag, 'rel') ?? ''))
		.map((tag) => ({
			href: attrOf(tag, 'href'),
			size: Number(attrOf(tag, 'sizes')?.split('x')[0]) || (/apple-touch/i.test(tag) ? 180 : 0),
		}))
		.filter((icon): icon is { href: string; size: number } => !!icon.href && !/\.ico(\?|$)/i.test(icon.href));
	return icons.sort((a, b) => b.size - a.size).map((icon) => icon.href);
}

async function fetchImage(url: string) {
	return Buffer.from(await (await get(url)).arrayBuffer());
}

/** The article's own social card, cropped to OG size. */
async function fromOgImage(src: string) {
	return sharp(await fetchImage(src))
		.resize(WIDTH, HEIGHT, { fit: 'cover' })
		.webp({ quality: 82 })
		.toBuffer();
}

/** The site's icon, centred over a blurred, enlarged copy of itself. */
async function fromIcon(src: string) {
	const icon = await sharp(await fetchImage(src))
		.flatten({ background: '#ffffff' })
		.png()
		.toBuffer();
	const background = await sharp(icon)
		.resize(WIDTH, HEIGHT, { fit: 'cover' })
		.blur(60)
		.modulate({ brightness: 1.1 })
		.toBuffer();
	const foreground = await sharp(icon).resize(256, 256, { fit: 'contain', background: '#ffffff' }).toBuffer();
	return sharp(background)
		.composite([{ input: foreground, gravity: 'centre' }])
		.webp({ quality: 82 })
		.toBuffer();
}

/**
 * Thumbnail for an external post: its `og:image`, else its site's icon.
 *
 * Returns `undefined` when neither can be fetched (offline build, blocked
 * scraper…), so the caller can fall back to the generated card.
 */
export async function fetchExternalThumbnail(pageUrl: string): Promise<Buffer | undefined> {
	let html: string;
	try {
		html = await (await get(pageUrl)).text();
	} catch (e) {
		console.warn(`[external thumbnail] ${pageUrl}: ${(e as Error).message}`);
		return undefined;
	}

	const ogImage = findMeta(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);
	const candidates = [
		...(ogImage ? [() => fromOgImage(new URL(ogImage, pageUrl).href)] : []),
		...findIcons(html).map((href) => () => fromIcon(new URL(href, pageUrl).href)),
	];

	for (const attempt of candidates) {
		try {
			return await attempt();
		} catch (e) {
			console.warn(`[external thumbnail] ${pageUrl}: ${(e as Error).message}`);
		}
	}
}
