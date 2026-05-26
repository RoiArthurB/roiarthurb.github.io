// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/** @type {import('rehype-github-alerts').DefaultBuildType} */
const calloutBuild = (alertOptions, originalChildren) => {
    return {
        type: 'element',
        tagName: 'div',
        properties: {
            className: ['callout'],
            dataCallout: alertOptions.keyword.toLowerCase(),
        },
        children: originalChildren,
    };
};

function fetchAvatarsIntegration() {
    return {
        name: 'fetch-avatars',
        hooks: {
            'astro:config:done': async ({ logger }) => {
                const avatarsDir = resolve(process.cwd(), 'public/avatars');
                await mkdir(avatarsDir, { recursive: true });

                const downloadImage = async (id, url) => {
                    if (!url?.startsWith('http')) return;
                    const dest = resolve(avatarsDir, `${id}.webp`);
                    if (existsSync(dest)) return;
                    try {
                        const res = await fetch(url);
                        if (!res.ok) { logger.warn(`Failed to fetch image for ${id}: HTTP ${res.status}`); return; }
                        const buf = Buffer.from(await res.arrayBuffer());
                        await writeFile(dest, await sharp(buf).webp({ quality: 85 }).toBuffer());
                        logger.info(`Cached image for ${id}`);
                    } catch (e) {
                        logger.warn(`Failed to fetch image for ${id}: ${e.message}`);
                    }
                };

                const dataDir = resolve(process.cwd(), 'src/data');
                const [authors, software] = await Promise.all([
                    readFile(resolve(dataDir, 'authors.json'), 'utf-8').then(JSON.parse),
                    readFile(resolve(dataDir, 'software.json'), 'utf-8').then(JSON.parse),
                ]);

                await Promise.all([
                    ...authors.map(a => downloadImage(a.id, a.avatar)),
                    ...software.map(s => downloadImage(s.id, s.logo)),
                ]);
            }
        }
    };
}
// https://astro.build/config
export default defineConfig({
	site: 'https://arthurbrugiere.fr',
	base: process.env.BASE_PATH || '/',
	integrations: [
		mdx(),
		sitemap(),
		fetchAvatarsIntegration(),
	],
	markdown: {
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'gruvbox-dark-medium',
			},
		},
		rehypePlugins: [
			[rehypeGithubAlerts, { build: calloutBuild }],
		],
	},
	build: {
		inlineStylesheets: 'always',
	},
});