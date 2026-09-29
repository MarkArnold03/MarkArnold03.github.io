// Builds the static site from src/. Usage: node build.mjs
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { langs, site } from './src/content.mjs';
import { homePage, workPage, projectPages, aboutPage, contactPage, notFound, redirect, INIT } from './src/page.mjs';
import { dispatchPage } from './src/dispatch.mjs';

const hash = createHash('sha256').update(INIT).digest('base64');
const csp = [
  "default-src 'none'",
  `script-src 'self' 'sha256-${hash}'`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const out = (path, html) => {
  mkdirSync(dirname(path) || '.', { recursive: true });
  writeFileSync(path, html);
  console.log('wrote', path);
};

// Every page, in both languages. `sub` is the path inside a language ('' = home).
const pageSubs = [];
for (const L of [langs.en, langs.sv]) {
  const pages = [
    ['', homePage(L, csp)],
    ['work/', workPage(L, csp)],
    ...projectPages(L, csp),
    ['about/', aboutPage(L, csp)],
    ['contact/', contactPage(L, csp)],
    ['dispatch/', dispatchPage(L, csp)],
  ];
  for (const [sub, html] of pages) {
    out(`${L.path}${sub}index.html`, html);
    if (L.lang === 'en') pageSubs.push(sub);
  }
}
out('404.html', notFound(langs, csp));

// Old URLs from earlier versions of the site point to their new place.
const moved = {
  'about.html': 'about/', 'work.html': 'work/', 'contact.html': 'contact/', 'exam.html': 'about/#education',
  'work/lapx.html': 'work/lapx/', 'work/bankwebapp.html': 'work/bankwebapp/', 'work/rising-rock.html': 'work/rising-rock/',
};
for (const [path, to] of Object.entries(moved)) {
  out(path, redirect(`${site.url}${to}`, csp));
  out(`sv/${path}`, redirect(`${site.url}sv/${to}`, csp));
}

// Sitemap and robots.txt for search engines. Each entry lists its English and Swedish URL.
const sitemapPages = pageSubs.map(sub => [sub, `sv/${sub}`]);
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapPages.flatMap(([en, sv]) => [en, sv].map(loc => `  <url>
    <loc>${site.url}${loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${site.url}${en}"/>
    <xhtml:link rel="alternate" hreflang="sv" href="${site.url}${sv}"/>
  </url>`)).join('\n')}
</urlset>
`);
out('robots.txt', `User-agent: *\nAllow: /\nDisallow: /tests/\nDisallow: /tools/\n\nSitemap: ${site.url}sitemap.xml\n`);

// Web app manifest: makes the site installable.
out('manifest.webmanifest', JSON.stringify({
  name: `${site.name} — Terminal`,
  short_name: 'MW Terminal',
  description: langs.en.description,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#efebe3',
  theme_color: '#16150f',
  icons: [
    { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');

// Service worker. The cache name is a hash of everything it precaches, so each
// deploy with changed files gets a fresh cache and old ones are dropped.
const precache = {
  ...Object.fromEntries(pageSubs.flatMap(sub => [[`/${sub}`, `${sub}index.html`], [`/sv/${sub}`, `sv/${sub}index.html`]])),
  '/404.html': '404.html',
  '/assets/site.css': 'assets/site.css', '/assets/site.js': 'assets/site.js', '/assets/dispatch.js': 'assets/dispatch.js',
  '/assets/fonts/archivo.woff2': 'assets/fonts/archivo.woff2',
  '/assets/fonts/jetbrains-mono-400.woff2': 'assets/fonts/jetbrains-mono-400.woff2',
  '/assets/fonts/jetbrains-mono-700.woff2': 'assets/fonts/jetbrains-mono-700.woff2',
  '/assets/img/icon-192.png': 'assets/img/icon-192.png',
  ['/' + site.cv.en]: site.cv.en, ['/' + site.cv.sv]: site.cv.sv,
};
const version = createHash('sha256');
for (const file of Object.values(precache)) version.update(readFileSync(file));
out('sw.js', readFileSync('src/sw.js', 'utf8')
  .replace('__VERSION__', version.digest('hex').slice(0, 12))
  .replace('__PRECACHE__', JSON.stringify(Object.keys(precache))));

// The old stylesheet and script are no longer used.
for (const f of ['assets/style.css', 'assets/main.js']) if (existsSync(f)) { rmSync(f); console.log('removed', f); }
