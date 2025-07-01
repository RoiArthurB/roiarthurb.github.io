# Docusaurus tools

## Generate PDF

Using `docs-to-pdf` https://github.com/jean-humann/docs-to-pdf

```
npx docs-to-pdf --initialDocURLs="http://localhost:3000/wiki/Home" --contentSelector="article" --paginationSelector="a.pagination-nav__link.pagination-nav__link--next" --excludeSelectors=".margin-vert--xl a,[class^='tocCollapsible'],.breadcrumbs,.theme-edit-this-page" --coverImage="https://gama-platform.org/img/gama-logo.png" --coverTitle="GAMA Platform v1.9.2" --protocolTimeout="3800000" --disableTOC
```

:::tip

1. More efficient to run over localhost
1. `--protocolTimeout` cover full PDF generation, not only scraping
1. Settings for Docusaurus
    1. Disable `respectPrefersColorScheme`
    1. Force `defaultMode` to 'light'

:::

## Debug

### Missing puppeteer browser

Since the npx tool is a bit old, it's possible it doesn't work directly with an error message like this : 

```
$ npx docs-to-pdf  [...]

[30.06.2025 21:46.39.260] [DEBUG] Using Chromium from /home/roiarthurb/.cache/puppeteer/chrome/linux-117.0.5938.92/chrome-linux64/chrome
[30.06.2025 21:46.39.265] [ERROR] Error: Failed to launch the browser process! spawn /home/roiarthurb/.cache/puppeteer/chrome/linux-117.0.5938.92/chrome-linux64/chrome ENOENT


TROUBLESHOOTING: https://pptr.dev/troubleshooting

    at ChildProcess.onClose (/home/roiarthurb/.npm/_npx/c16ac64a6c7aba73/node_modules/@puppeteer/browsers/lib/cjs/launch.js:277:24)
    at ChildProcess.emit (node:events:507:28)
    at ChildProcess._handle.onexit (node:internal/child_process:292:12)
    at onErrorNT (node:internal/child_process:484:16)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
```

You fix this error by simply edit a file to hard-code a link to a chromium binary to use instead of missing embedded browser like so : 

```diff
───────────────────────────────────────────────────────────────────────────────────────────────
$ nano: ~/.npm/_npx/c16ac64a6c7aba73/node_modules/docs-to-pdf/lib/utils.js
───────────────────────────────────────────────────────────────────────────────────────────────
@ utils.js:44 @ async function generatePDF({ initialDocURLs, excludeURLs, outputPDFFilename = 'd
     console.debug(chalk_1.default.cyan(`Using Chromium from ${execPath}`));
     const browser = await puppeteer.launch({
         headless: 'new',
-        executablePath: execPath,
+        executablePath: '/usr/bin/chromium',
         args: puppeteerArgs,
         protocolTimeout: protocolTimeout,
     });
```