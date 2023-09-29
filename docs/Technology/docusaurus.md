# Docusaurus v2

## Generate PDF

Using `docs-to-pdf` https://github.com/jean-humann/docs-to-pdf

```
npx docs-to-pdf --initialDocURLs="http://localhost:3000/wiki/Home" --contentSelector="article" --paginationSelector="a.pagination-nav__link.pagination-nav__link--next" --excludeSelectors=".margin-vert--xl a,[class^='tocCollapsible'],.breadcrumbs,.theme-edit-this-page" --coverImage="https://gama-platform.org/img/gama-logo.png" --coverTitle="GAMA Platform v1.9.2" --protocolTimeout="3800000" --disableTOC
```

Notes:
1. More efficient to run over localhost
1. `--protocolTimeout` cover full PDF generation, not only scraping
1. Settings for Docusaurus
    1. Disable `respectPrefersColorScheme`
    1. Force `defaultMode` to 'light'
