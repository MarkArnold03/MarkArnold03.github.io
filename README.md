# MarkArnold03.github.io

[![CI](https://github.com/MarkArnold03/MarkArnold03.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkArnold03/MarkArnold03.github.io/actions/workflows/ci.yml)

Portfolio of Mark Walusimbi, built as a freight terminal: a split-flap departures board, projects you track like parcels, a route map of the career, skills packed in crates, the degree as customs papers, and contact as "book a pickup". English at `/`, Swedish at `/sv/`.

Pages (same structure under `/sv/`):

| URL | Page |
| --- | --- |
| `/` | Home: hero, departures board, key figures, featured work, contact prompt |
| `/work/` | All projects as cards, plus tracking-number search |
| `/work/lapx/`, `/work/redriver/`, `/work/bankwebapp/`, `/work/rising-rock/` | One page per project |
| `/about/` | Career route map, skills, degree and CV |
| `/dispatch/` | Live dispatch demo |
| `/contact/` | Direct lines and booking form |

**Dispatch demo** at [`/dispatch/`](https://markarnold03.github.io/dispatch/): a simulated fleet on a schematic Stockholm, with shortest-path routing, auto and manual dispatch, a live event feed, and an offline outbox in IndexedDB that replays on reconnect.

Plain HTML, CSS and JavaScript. No framework, no cookies, no trackers, fonts self-hosted. Installable and works offline (service worker).

## Editing

All text lives in one file, in both languages: `src/content.mjs`. After editing, rebuild and commit the output:

```sh
node build.mjs
```

This writes `index.html`, `sv/index.html`, `404.html`, redirect pages for the old URLs, `sitemap.xml`, `robots.txt`, the web app manifest and the service worker (`sw.js`, versioned by a hash of the files it caches). It also recomputes the Content-Security-Policy hash for the small inline script.

Other scripts (need `npm install` once):

| Command | What it does |
| --- | --- |
| `npm test` | Browser tests with Playwright (rendering, CSP, tracker, language switch, offline mode, dispatch demo, …) |
| `npm run images` | Renders the social preview cards and app icons into `assets/img/` |
| `npm run cv` | Prints the English CV from `tools/cv-en.html` to `assets/docs/CV_Mark_Walusimbi_EN.pdf` |

## CI

Every push runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): it checks that the committed build output matches `src/`, runs the browser tests, and runs Lighthouse (accessibility, best practices and SEO must score at least 95).

## Layout

| Path | What it is |
| --- | --- |
| `src/content.mjs` | All copy, projects ("shipments"), route stops, skills, degree courses |
| `src/page.mjs` | Layout (header, footer, breadcrumbs) and every page: home, work, project pages, about, contact |
| `src/sw.js` | Service worker template |
| `src/dispatch.mjs`, `src/dispatch-data.mjs` | Dispatch demo page and its map data (roads, water, trucks) |
| `assets/site.css` | Styles, day and night shift themes |
| `assets/site.js` | Board animation, tracker, clock, theme, booking email, offline notice |
| `assets/dispatch.js` | Dispatch simulation: routing, events, outbox, rendering |
| `assets/docs/` | CV in Swedish and English (PDF) |
| `assets/img/` | Social preview cards and app icons |
| `assets/fonts/` | Archivo and JetBrains Mono (SIL Open Font License) |
| `tests/` | Browser tests and the local test server |
| `tools/` | Image and CV renderers |
