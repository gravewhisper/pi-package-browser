# Pi Package Browser

A fast, vibe slopped static browser for npm packages tagged `pi-package` because https://pi.dev/packages is glitching and lagging on my end.

Live site: https://gravewhisper.github.io/pi-package-browser/

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

Published site:
- https://gravewhisper.github.io/pi-package-browser/

The site is served from the `docs/` directory.
