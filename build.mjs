// Builds the static site from src/. Usage: node build.mjs
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { langs, site } from './src/content.mjs';
import { page, notFound, redirect, INIT } from './src/page.mjs';
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

out('index.html', page(langs.en, csp));
out('sv/index.html', page(langs.sv, csp));
out('404.html', notFound(langs, csp));

// Extra pages add their files here so the service worker precaches them.
const extraPrecache = {};
const extraSitemap = [];

// Dispatch demo.
out('dispatch/index.html', dispatchPage(langs.en, csp));
out('sv/dispatch/index.html', dispatchPage(langs.sv, csp));
Object.assign(extraPrecache, { '/dispatch/': 'dispatch/index.html', '/sv/dispatch/': 'sv/dispatch/index.html', '/assets/dispatch.js': 'assets/dispatch.js' });
extraSitemap.push(['dispatch/', 'sv/dispatch/']);

// Old URLs from the previous version of the site point to their new place.
const moved = {
  'about.html': '#route', 'work.html': '#track', 'contact.html': '#pickup', 'exam.html': '#docs',
  'work/lapx.html': '#MW-LAPX-25', 'work/bankwebapp.html': '#MW-BANK-23', 'work/rising-rock.html': '#MW-RROCK',
};
for (const [path, anchor] of Object.entries(moved)) {
  out(path, redirect(`${site.url}${anchor}`, csp));
  out(`sv/${path}`, redirect(`${site.url}sv/${anchor}`, csp));
}

// Sitemap and robots.txt for search engines. Each entry lists its English and Swedish URL.
const sitemapPages = [['', 'sv/'], ...extraSitemap];
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
  '/': 'index.html', '/sv/': 'sv/index.html', '/404.html': '404.html',
  '/assets/site.css': 'assets/site.css', '/assets/site.js': 'assets/site.js',
  '/assets/fonts/archivo.woff2': 'assets/fonts/archivo.woff2',
  '/assets/fonts/jetbrains-mono-400.woff2': 'assets/fonts/jetbrains-mono-400.woff2',
  '/assets/fonts/jetbrains-mono-700.woff2': 'assets/fonts/jetbrains-mono-700.woff2',
  '/assets/img/icon-192.png': 'assets/img/icon-192.png',
  ['/' + site.cv.en]: site.cv.en, ['/' + site.cv.sv]: site.cv.sv,
  ...extraPrecache,
};
const version = createHash('sha256');
for (const file of Object.values(precache)) version.update(readFileSync(file));
out('sw.js', readFileSync('src/sw.js', 'utf8')
  .replace('__VERSION__', version.digest('hex').slice(0, 12))
  .replace('__PRECACHE__', JSON.stringify(Object.keys(precache))));

// The old stylesheet and script are no longer used.
for (const f of ['assets/style.css', 'assets/main.js']) if (existsSync(f)) { rmSync(f); console.log('removed', f); }
