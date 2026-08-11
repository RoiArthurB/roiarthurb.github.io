---
title: Colophon
lede: How this site is built, compressed, and shipped.
description: The stack, image pipeline, fonts, and deployment behind this site.
updatedDate: 2026-07-24
---

## Built with

- [Astro](https://astro.build/) — static-first, ships almost no JavaScript. Every page is pre-rendered to HTML at build time.
  - Started from **amazing** the [astro-scholar](https://github.com/shravanngoswamii/astro-scholar) theme, heavily reworked since.
- Content is Markdown/MDX. Code blocks are highlighted at build time with [Shiki](https://shiki.style/) (`github-light` / `gruvbox-dark-medium`), and GitHub-style alerts become callouts via `rehype-github-alerts`.
- Full-text search is powered by [Pagefind](https://pagefind.app/), which indexes the built site as a post-build step — no search server required.
- An [Atom feed](/feed.xml) and a sitemap are generated on every build. A legacy [RSS feed](/rss.xml) is still served for older subscribers.

## Images & performance

- Every raster image is compressed to [*WebP*](https://en.wikipedia.org/wiki/Webp) with [sharp](https://sharp.pixelplumbing.com/), targeting quality 85.
- Author and software-logo avatars are fetched from Github once at build time, converted to WebP (and cached in `public/avatars/` so later builds skip the download).
- Social / Open Graph cards are generated on the fly: an HTML template is turned into an SVG with [Satori](https://github.com/vercel/satori), rasterised with [resvg](https://github.com/RazrFalcon/resvg), then encoded to WebP with sharp — served straight from a `.webp` route.
- Stylesheets are inlined into the HTML to cut render-blocking requests.

## Typography

- Main titles are set in [**Epical Comeback**](https://zeenesia.com/product/epical-comeback/), a fancy display serif.
- Sub-titles uses [**Agina**](https://rantaustudio.com/product/agina-elegant-classy-serif-font/)
- Body text [**Atkinson Hyperlegible**](https://en.wikipedia.org/wiki/Atkinson_Hyperlegible) for sans-serif UI.
- All fonts are self-hosted and preloaded.

## Deployment

- Hosted on **GitHub Pages** at [arthurbrugiere.fr](https://arthurbrugiere.fr).
- Every push to `main` triggers a GitHub Actions workflow: 
  - it installs dependencies with `npm ci` on Node 24,
  - runs the Astro build,
  - post-processes the HTML with [`html-link-action`](https://github.com/shravanngoswamii/html-link-action) 
    - adding `nofollow`/`noopener`/`noreferrer`/`target="_blank"` to external links
    - stripping tracking parameters
    - checking for broken links
    - etc.
- The built site is published to the `gh-pages` branch, and deployed automatically

## Elsewhere

- Source and history live on [GitHub](https://github.com/RoiArthurB/roiarthurb.github.io).

<a class="slash-back" href="/slashes">← all slash pages</a>
