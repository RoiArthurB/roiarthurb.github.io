// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
// https://astro.build/config
export default defineConfig({
	site: 'https://arthurbrugiere.fr',
	base: process.env.BASE_PATH || '/',
	integrations: [
		mdx(),
		sitemap()
	],
	markdown: {
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
		},
	},
	build: {
		inlineStylesheets: 'always',
	},
});