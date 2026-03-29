# Pi Package Browser

A fast static browser for npm packages tagged `pi-package`.

It keeps the GitHub Pages setup simple and fetches package data live from the browser.

## What it does

- queries npm search for `keywords:pi-package`
- lazily enriches packages with each package's latest `pi` manifest metadata
- folds in upstream package flag issues from `badlogic/pi-mono`
- keeps the grid capped with infinite scrolling and a manual load-more button
- serves a GitHub Pages-friendly UI from `docs/`

## Local usage

```bash
npm run preview
```

Then open `http://localhost:4173`.

## GitHub Pages

The site is ready to publish from the `docs/` directory.
