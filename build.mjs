// Builds the static site from src/. Usage: node build.mjs
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { langs, site } from './src/content.mjs';
import { page, notFound, redirect, INIT } from './src/page.mjs';

const hash = createHash('sha256').update(INIT).digest('base64');
const csp = [
  "default-src 'none'",
  `script-src 'self' 'sha256-${hash}'`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
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

// Old URLs from the previous version of the site point to their new place.
const moved = {
  'about.html': '#route', 'work.html': '#track', 'contact.html': '#pickup', 'exam.html': '#docs',
  'work/lapx.html': '#MW-LAPX-25', 'work/bankwebapp.html': '#MW-BANK-23', 'work/rising-rock.html': '#MW-RROCK',
};
for (const [path, anchor] of Object.entries(moved)) {
  out(path, redirect(`${site.url}${anchor}`, csp));
  out(`sv/${path}`, redirect(`${site.url}sv/${anchor}`, csp));
}

// The old stylesheet and script are no longer used.
for (const f of ['assets/style.css', 'assets/main.js']) if (existsSync(f)) { rmSync(f); console.log('removed', f); }
