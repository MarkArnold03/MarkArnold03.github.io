# MarkArnold03.github.io

Portfolio of Mark Walusimbi, built as a freight terminal: a split-flap departures board, projects you track like parcels, a route map of the career, skills packed in crates, the degree as customs papers, and contact as "book a pickup". English at `/`, Swedish at `/sv/`.

Plain HTML, CSS and JavaScript. No framework, no cookies, no trackers, fonts self-hosted.

## Editing

All text lives in one file, in both languages: `src/content.mjs`. After editing, rebuild and commit the output:

```sh
node build.mjs
```

This writes `index.html`, `sv/index.html`, `404.html` and redirect pages for the old URLs. It also recomputes the Content-Security-Policy hash for the small inline script.

| Path | What it is |
| --- | --- |
| `src/content.mjs` | All copy, projects ("shipments"), route stops, skills, degree courses |
| `src/page.mjs` | HTML template |
| `assets/site.css` | Styles, day and night shift themes |
| `assets/site.js` | Board animation, tracker, clock, theme, booking email |
| `assets/docs/`, `assets/img/` | CV and redacted degree certificate |
| `assets/fonts/` | Archivo and JetBrains Mono (SIL Open Font License) |
