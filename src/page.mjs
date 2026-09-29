import { site, courses, stops } from './content.mjs';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => s.split('\n').map(esc).join('<br>');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Decorative barcode: bar widths derived from the characters of a string.
export function barcode(str, cls = 'barcode') {
  let x = 0, bars = '';
  const bar = w => { bars += `<rect x="${x}" width="${w}" height="40"/>`; };
  bar(1); x += 2; bar(1); x += 2; // start guard
  for (const ch of str) {
    const c = ch.charCodeAt(0) * 7 + 13;
    for (let b = 0; b < 6; b++) {
      const w = (c >> b) & 1 ? 2.4 : 1;
      bar(w);
      x += w + ((c >> ((b + 3) % 8)) & 1 ? 1.8 : 1);
    }
  }
  bar(1); x += 2; bar(1); x += 1; // end guard
  return `<svg class="${cls}" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">${bars}</svg>`;
}

export const icon = {
  arrow: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  down: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v14M6 12l6 6 6-6M5 21h14"/></svg>',
  ext: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>',
  truck: '<svg class="truck" viewBox="0 0 32 20" aria-hidden="true" focusable="false"><path d="M1 3h18v11H1zM19 7h6l5 5v2h-11z"/><circle cx="7" cy="16" r="3"/><circle cx="24" cy="16" r="3"/></svg>',
  sun: '<svg class="i i-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i i-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  lock: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

const BOARD_W = [4, 14, 14, 10];

// Paths for a page: `sub` is the page path inside a language ('' for home, 'work/lapx/' …).
// base = relative path to the site root, root = relative path to this language's home.
export function ctx(L, sub = '') {
  const depth = (L.path + sub).split('/').filter(Boolean).length;
  const base = '../'.repeat(depth);
  return { sub, base, root: base + L.path };
}
const shipmentHref = (c, s) => s.slug ? `${c.root}work/${s.slug}/` : `${c.root}${s.href}`;
const resolve = (c, href) => /^(https?:|mailto:|#)/.test(href) ? href : c.root + href;

// Structured data so search engines understand who the site is about.
function personJson(L) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    url: site.url + L.path,
    image: `${site.url}assets/img/og-${L.lang}.png`,
    jobTitle: L.jobTitle,
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Stockholm', addressCountry: 'SE' },
    alumniOf: { '@type': 'EducationalOrganization', name: 'KYH' },
    knowsAbout: ['C#', '.NET', 'ASP.NET Core', 'Entity Framework Core', 'SQL Server', 'JavaScript', 'TypeScript', 'PWA', 'SignalR'],
    knowsLanguage: ['en', 'sv', 'lg'],
    sameAs: [site.linkedin, site.github],
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function head(L, base, csp, { sub = '', title = L.title, description = L.description, person = false } = {}) {
  const url = site.url + L.path + sub;
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${L.lang === 'sv' ? 'sv_SE' : 'en_GB'}">
<meta property="og:image" content="${site.url}assets/img/og-${L.lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(L.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="${base}manifest.webmanifest">
<link rel="apple-touch-icon" href="${base}assets/img/apple-touch-icon.png">
${person ? `<script type="application/ld+json">${personJson(L)}</script>\n` : ''}<meta name="theme-color" content="#efebe3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e0f0c" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23ff5a1f'/%3E%3Ctext x='32' y='42' font-family='monospace' font-size='26' font-weight='700' fill='%2316150f' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${site.url}${sub}">
<link rel="alternate" hreflang="sv" href="${site.url}sv/${sub}">
<link rel="alternate" hreflang="x-default" href="${site.url}${sub}">
<link rel="preload" href="${base}assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/jetbrains-mono-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/site.css">
<script>${INIT}</script>
</head>`;
}

// Runs before first paint: applies the saved shift (theme) and marks JS as available.
export const INIT = "(function(d){d.classList.add('js');try{var s=localStorage.getItem('mw-shift');if(s==='day'||s==='night')d.setAttribute('data-shift',s)}catch(e){}})(document.documentElement)";

export function topbar(L, c, { ticker = false } = {}) {
  const current = p => c.sub === p || (p === 'work/' && c.sub.startsWith('work/'));
  return `<a class="skip" href="#main">${esc(L.skip)}</a>
<header class="top">
  <div class="top-in">
    <a class="logo" href="${c.root || './'}"${c.sub === '' ? ' aria-current="page"' : ''}><span class="logo-mark" aria-hidden="true">MW</span><span class="logo-text">${esc(site.name)}<small>${esc(L.logoSub)}</small></span></a>
    <nav class="nav" aria-label="${esc(L.navLabel)}">
      ${L.nav.map(([p, label], i) => `<a href="${c.root}${p}"${current(p) ? ' aria-current="page"' : ''}><span aria-hidden="true">0${i + 1}</span>${esc(label)}</a>`).join('\n      ')}
    </nav>
    <div class="tools">
      <span class="clock" title="${esc(L.clockLabel)}"><span class="clock-tz" aria-hidden="true">STO</span> <time class="js-clock">--:--</time></span>
      <a class="lang" href="${c.base}${L.otherPath}${c.sub}" hreflang="${L.other}" lang="${L.other}" aria-label="${esc(L.otherName)}">${L.otherLabel}</a>
      <button class="shift" type="button" data-day="${esc(L.shift.day)}" data-night="${esc(L.shift.night)}" data-to-day="${esc(L.shift.toDay)}" data-to-night="${esc(L.shift.toNight)}" aria-label="${esc(L.shift.toNight)}">${icon.sun}${icon.moon}<span class="shift-label">${esc(L.shift.day)}</span></button>
      <a class="btn-cv" href="${c.base}${site.cv[L.lang]}" download aria-label="${esc(L.cvAria)}">${icon.down}<span>${esc(L.cvShort)}</span></a>
    </div>
  </div>${ticker ? `
  <div class="ticker" aria-label="${esc(L.tickerLabel)}">
    <div class="ticker-track">
      <p>${L.ticker.map(t => `<span>${esc(t)}</span>`).join('')}</p>
      <p aria-hidden="true">${L.ticker.map(t => `<span>${esc(t)}</span>`).join('')}</p>
    </div>
  </div>` : ''}
</header>`;
}

export function footer(L, c) {
  const F = L.footer, P = L.pages;
  return `<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="ship-label">
      <div class="sl-grid">
        <div><span class="mono-label">${esc(F.from)}</span><p>${nl2br(F.fromVal)}</p></div>
        <div><span class="mono-label">${esc(F.to)}</span><p>${esc(F.toVal)}</p></div>
        <div><span class="mono-label">${esc(F.service)}</span><p>${esc(F.serviceVal)}</p></div>
      </div>
      ${barcode('MARKARNOLD03.GITHUB.IO', 'barcode foot-barcode')}
      <p class="mono-label sl-no">MW-2026-PORTFOLIO · © <span class="js-year">2026</span> ${esc(site.name.toUpperCase())}</p>
    </div>
    <nav class="foot-nav" aria-label="${esc(P.footerNav)}">
      <div><h2 class="mono-label">${esc(P.footerNav)}</h2><ul>
        <li><a href="${c.root || './'}">${esc(L.homeLabel)}</a></li>
        ${L.nav.map(([p, label]) => `<li><a href="${c.root}${p}">${esc(label)}</a></li>`).join('\n        ')}
      </ul></div>
      <div><h2 class="mono-label">${esc(P.footerDocs)}</h2><ul>
        <li><a href="${c.base}${site.cv.en}" download hreflang="en">${esc(P.cvEn)}</a></li>
        <li><a href="${c.base}${site.cv.sv}" download hreflang="sv">${esc(P.cvSv)}</a></li>
      </ul></div>
      <div><h2 class="mono-label">${esc(P.footerElsewhere)}</h2><ul>
        <li><a href="${site.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
        <li><a href="${site.github}" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        <li><a href="mailto:${site.email}">${esc(L.pickup.email)}</a></li>
      </ul></div>
    </nav>
  </div>
  <p class="built wrap">${esc(F.built)}</p>
</footer>`;
}

// Full page: head, header, main, footer and scripts.
export function layout(L, csp, sub, { title, description, person = false, ticker = false, bodyClass = '', main, scripts = [] }) {
  const c = ctx(L, sub);
  return `${head(L, c.base, csp, { sub, title, description, person })}
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${topbar(L, c, { ticker })}
<main id="main">
${main(c)}
</main>
${footer(L, c)}
<div class="toast" role="status" aria-live="polite" data-offline="${esc(L.net.offline)}" data-online="${esc(L.net.online)}"></div>
<script src="${c.base}assets/site.js" defer></script>
${scripts.map(s => `<script src="${c.base}${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

export function sectionHead(dock, title, lede, id, level = 2) {
  return `<div class="sec-head">
    <p class="dock">${esc(dock)}</p>
    <h${level} id="${id}-title">${esc(title)}</h${level}>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
  </div>`;
}

function pageHead(L, c, { dock, h1, lede, crumbs = [] }) {
  return `<header class="page-head">
  <div class="wrap">
    ${crumbs.length ? `<nav class="crumbs" aria-label="${esc(L.crumbsLabel)}"><ol>
      <li><a href="${c.root || './'}">${esc(L.homeLabel)}</a></li>
      ${crumbs.map(([label, href]) => href ? `<li><a href="${href}">${esc(label)}</a></li>` : `<li><span aria-current="page">${esc(label)}</span></li>`).join('\n      ')}
    </ol></nav>` : ''}
    <p class="dock">${esc(dock)}</p>
    <h1 class="page-title">${esc(h1)}</h1>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
  </div>
</header>`;
}

/* ---------- components ---------- */

function board(L, c) {
  const cell = (text, w, cls) => `<span class="cell ${cls}" data-w="${w}">${esc(text)}</span>`;
  const rows = L.shipments.map(s => {
    const st = L.status[s.status];
    const alt = s.status === 'boarding' ? ` data-alt="${esc(L.statusAlt.toUpperCase())}"` : '';
    const sr = `${s.board[0]}, ${s.title}, ${s.board[2]}, ${st}`;
    return `<li><a class="row s-${s.status}" href="${shipmentHref(c, s)}" data-code="${s.code}"><span class="sr">${esc(sr)}</span><span class="cells" aria-hidden="true">${cell(s.board[0], BOARD_W[0], 'c-year')}${cell(s.board[1], BOARD_W[1], 'c-dest')}${cell(s.board[2], BOARD_W[2], 'c-via')}<span class="cell c-status" data-w="${BOARD_W[3]}"${alt}>${esc(st.toUpperCase())}</span></span></a></li>`;
  }).join('\n      ');
  return `<div class="board" role="group" aria-label="${esc(L.board.label)}">
    <div class="board-top"><span class="board-title">${esc(L.board.head)}</span><span class="board-sub" aria-hidden="true">STOCKHOLM · <time class="js-clock">--:--</time></span></div>
    <div class="board-cols" aria-hidden="true">${L.board.cols.map((t, i) => `<span class="col-${i}">${esc(t)}</span>`).join('')}</div>
    <ol class="board-rows">
      ${rows}
    </ol>
    <p class="board-hint">${esc(L.board.hint)} ${icon.arrow}</p>
  </div>`;
}

// A shipment as a card: the whole card is clickable through the title link.
function card(L, c, s) {
  const W = L.pages.work;
  const cta = s.slug ? W.open : s.href.startsWith('dispatch') ? W.openDemo : s.href.startsWith('about') ? W.openAbout : W.openContact;
  const period = s.meta.find(([, v]) => /\d{2}\/\d{4}/.test(v))?.[1];
  const meta = [s.meta[0][1], period].filter(Boolean).join(' · ');
  return `<article class="ship-card s-${s.status}" data-code="${s.code}">
        <div class="sc-top"><span class="sc-code">${s.code}</span><span class="status s-${s.status}">${esc(L.status[s.status])}</span></div>
        <h3><a class="sc-link" href="${shipmentHref(c, s)}">${esc(s.title)}</a></h3>
        <p class="sc-summary">${esc(s.summary)}</p>
        <p class="sc-meta">${esc(meta)}</p>
        <ul class="sc-tags">${s.contents.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <span class="sc-go" aria-hidden="true">${esc(cta)} ${icon.arrow}</span>
      </article>`;
}

function parcel(L, c, s) {
  const T = L.track;
  const pct = s.status === 'boarding' ? 'p-start' : 'p-done';
  const link = ([href, label]) => {
    const ext = href.startsWith('http');
    return `<a class="btn btn-line btn-sm" href="${esc(resolve(c, href))}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)} ${ext ? icon.ext : icon.arrow}</a>`;
  };
  return `<article class="parcel parcel-page" data-code="${s.code}">
      <header class="parcel-head">
        <div>
          <p class="mono-label">${esc(T.number)} · <span class="parcel-code-sm">${s.code}</span></p>
          <h1 class="parcel-title">${esc(s.title)}</h1>
          <p class="lede parcel-summary">${esc(s.summary)}</p>
        </div>
        <span class="status s-${s.status}">${esc(L.status[s.status])}</span>
      </header>
      <div class="leg ${pct} go">
        <div class="leg-end"><span class="mono-label">${esc(T.from)}</span><strong>${esc(s.from)}</strong></div>
        <div class="leg-bar" aria-hidden="true"><i></i>${icon.truck}</div>
        <div class="leg-end leg-to"><span class="mono-label">${esc(T.to)}</span><strong>${esc(s.to)}</strong></div>
      </div>
      <dl class="parcel-meta">${s.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="parcel-body">
        <div>
          <h2 class="mono-label">${esc(T.events)}</h2>
          <ol class="events">${s.events.map(([when, tag, text], i) => `
            <li class="${[i === 0 && 'latest', !when && 'no-date'].filter(Boolean).join(' ')}"><span class="ev-when">${esc(when)}</span><div><strong class="ev-tag">${esc(tag)}</strong><p>${esc(text)}</p></div></li>`).join('')}
          </ol>
        </div>
        <aside>
          <h2 class="mono-label">${esc(T.contents)}</h2>
          <ul class="tags">${s.contents.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          ${s.note ? `<p class="note">${icon.lock}<span>${esc(s.note)}</span></p>` : ''}
          ${s.links ? `<div class="parcel-links">${s.links.map(link).join('')}</div>` : ''}
          ${barcode(s.code, 'barcode parcel-barcode')}
        </aside>
      </div>
    </article>`;
}

function trackForm(L, c) {
  const T = L.track, W = L.pages.work;
  return `<form class="track-bar" role="search" data-notfound="${esc(T.notFound)}">
      <label for="track-q">${esc(W.trackLabel)}</label>
      <div class="track-input">
        <input id="track-q" name="q" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="${esc(T.placeholder)}">
        <button class="btn btn-accent" type="submit">${esc(T.button)} ${icon.arrow}</button>
      </div>
      <p class="track-key" aria-hidden="true"><kbd>/</kbd> ${esc(T.key)}</p>
      <p class="track-msg" role="status" aria-live="polite"></p>
    </form>`;
}

function routeMap(L) {
  const X = s => 90 + s * 170;
  const Y = { code: 100, floor: 240, junction: 170 };
  const jx = X(5), nx = X(6);
  let marks = '';
  for (const s of stops) {
    const x = X(s.slot);
    if (s.lane === 'junction') {
      marks += `<rect class="stop stop-junction" x="${x - 15}" y="${Y.junction - 24}" width="30" height="48" rx="15"/>`;
      marks += `<text class="st-year" x="${x}" y="46">${s.year}</text><text class="st-name" x="${x}" y="68">${esc(s.name)}</text>`;
    } else {
      const y = Y[s.lane];
      marks += `<circle class="stop stop-${s.lane}" cx="${x}" cy="${y}" r="9"/>`;
      marks += s.lane === 'code'
        ? `<text class="st-year" x="${x}" y="46">${s.year}</text><text class="st-name" x="${x}" y="68">${esc(s.name)}</text>`
        : `<text class="st-name" x="${x}" y="284">${esc(s.name)}</text><text class="st-year" x="${x}" y="304">${s.year}</text>`;
    }
  }
  marks += `<circle class="stop stop-next-ring" cx="${nx}" cy="${Y.junction}" r="17"/><circle class="stop stop-next" cx="${nx}" cy="${Y.junction}" r="9"/>`;
  marks += `<text class="st-year" x="${nx}" y="46">2026</text><text class="st-name st-next" x="${nx}" y="68">${esc(L.route.next)}</text>`;
  return `<svg class="route-svg" viewBox="0 0 1200 330" role="img" aria-labelledby="route-svg-t">
      <title id="route-svg-t">${esc(L.route.label)}</title>
      <path class="ln ln-code" d="M${X(0)} ${Y.code}H${jx - 50}C${jx - 25} ${Y.code} ${jx - 25} ${Y.junction - 5} ${jx} ${Y.junction - 5}"/>
      <path class="ln ln-floor" d="M${X(1)} ${Y.floor}H${jx - 50}C${jx - 25} ${Y.floor} ${jx - 25} ${Y.junction + 5} ${jx} ${Y.junction + 5}"/>
      <path class="ln ln-code ln-merged" d="M${jx} ${Y.junction - 5}H${jx + 70}"/>
      <path class="ln ln-floor ln-merged" d="M${jx} ${Y.junction + 5}H${jx + 70}"/>
      <path class="ln ln-code ln-future" d="M${jx + 70} ${Y.junction - 5}H${nx}"/>
      <path class="ln ln-floor ln-future" d="M${jx + 70} ${Y.junction + 5}H${nx}"/>
      ${marks}
    </svg>`;
}

function routeSection(L) {
  const R = L.route;
  const lineName = { code: R.code, floor: R.floor, junction: R.both };
  return `<section id="route" class="sec" aria-labelledby="route-title">
  <div class="wrap">
    ${sectionHead(R.dock, R.title, R.lede, 'route')}
    <ul class="legend">
      <li><i class="key key-code"></i>${esc(R.code)}</li>
      <li><i class="key key-floor"></i>${esc(R.floor)}</li>
      <li><i class="key key-both"></i>${esc(R.both)}</li>
    </ul>
    <div class="route-scroll" tabindex="0" aria-label="${esc(R.label)}">
      ${routeMap(L)}
    </div>
    <p class="swipe" aria-hidden="true">${esc(R.swipe)} ${icon.arrow}</p>
    <h3 class="mono-label timetable-title">${esc(R.timetable)}</h3>
    <div class="table-wrap">
      <table class="timetable">
        <thead><tr>${R.cols.map(t => `<th scope="col">${esc(t)}</th>`).join('')}</tr></thead>
        <tbody>${R.rows.map(([y, lane, stop, note]) => `
          <tr><td class="mono">${esc(y)}</td><td><span class="line-tag line-${lane}">${esc(lineName[lane])}</span></td><th scope="row">${esc(stop)}</th><td>${esc(note)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

function skillsSection(L) {
  const M = L.manifest;
  return `<section id="skills" class="sec sec-alt" aria-labelledby="skills-title">
  <div class="wrap">
    ${sectionHead(M.dock, M.title, M.lede, 'skills')}
    <div class="crates">
      ${L.crates.map(([name, items], i) => `<article class="crate">
        <header><span class="mono-label">${esc(M.crate)} ${String(i + 1).padStart(2, '0')}</span><span class="mono-label">${esc(M.qty)} ${String(items.length).padStart(2, '0')}</span></header>
        <h3>${esc(name)}</h3>
        <ul>${items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
        ${barcode('MW' + slug(name), 'barcode crate-barcode')}
      </article>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

function educationSection(L, c) {
  const D = L.docs;
  const en = L.lang === 'en';
  return `<section id="education" class="sec" aria-labelledby="education-title">
  <div class="wrap">
    ${sectionHead(D.dock, D.title, D.lede, 'education')}
    <div class="docs">
      <article class="doc doc-cert">
        <header class="doc-head"><span class="mono-label">${esc(D.certKind)}</span><h3>${esc(D.certHead)}</h3></header>
        <dl class="doc-fields">${D.certFields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <div class="stamp" aria-hidden="true"><span>${esc(D.stamp[0])}</span><strong>${esc(D.stamp[1])}</strong><span>${esc(D.stamp[2])}</span></div>
        <details class="courses">
          <summary>${esc(D.courses)}</summary>
          <table>
            <thead><tr><th scope="col">${esc(D.courseCols[0])}</th><th scope="col" class="num">${esc(D.courseCols[1])}</th><th scope="col">${esc(D.courseCols[2])}</th></tr></thead>
            <tbody>${courses.map(([svName, enName, pts, g]) => `
              <tr><th scope="row">${esc(en ? enName : svName)}</th><td class="num">${pts}</td><td>${g === 'VG' ? `<span class="vg">${esc(D.grade.VG)}</span>` : esc(D.grade.G)}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><th scope="row">${esc(D.total)}</th><td class="num">${courses.reduce((a, x) => a + x[2], 0)}</td><td></td></tr></tfoot>
          </table>
          <p class="small">${esc(D.gradeNote)}</p>
        </details>
        <p class="note">${icon.lock}<span>${esc(D.onRequest)}</span></p>
      </article>
      <article class="doc doc-cv">
        <header class="doc-head"><span class="mono-label">${esc(D.cvKind)}</span><h3>${esc(D.cvHead)}</h3></header>
        <dl class="doc-fields">${D.cvFields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <a class="btn btn-accent btn-block" href="${c.base}${site.cv[L.lang]}" download>${icon.down} ${esc(D.cvButton)}</a>
        <a class="cv-alt" href="${c.base}${site.cv[L.other]}" hreflang="${L.other}" download>${esc(D.cvAlt)}</a>
        ${barcode('MW-CV-2026', 'barcode doc-barcode')}
        <p class="mono-label doc-no">MW-CV-2026 · ${esc(site.name.toUpperCase())}</p>
      </article>
    </div>
  </div>
</section>`;
}

function contactBody(L) {
  const P = L.pickup;
  return `<div class="pickup">
      <div class="lines">
        <h2 class="mono-label">${esc(P.lines)}</h2>
        <div class="line-item">
          <span class="mono-label">${esc(P.email)}</span>
          <a class="big-link" href="mailto:${site.email}">${esc(site.email)}</a>
          <button class="btn btn-line btn-sm js-copy" type="button" data-copy="${site.email}" data-done="${esc(P.copied)}">${esc(P.copy)}</button>
        </div>
        <div class="line-item">
          <span class="mono-label">LinkedIn</span>
          <a class="big-link" href="${site.linkedin}" target="_blank" rel="noopener noreferrer">mark-walusimbi ${icon.ext}</a>
        </div>
        <div class="line-item">
          <span class="mono-label">GitHub</span>
          <a class="big-link" href="${site.github}" target="_blank" rel="noopener noreferrer">MarkArnold03 ${icon.ext}</a>
        </div>
      </div>
      <form class="booking" data-email="${site.email}" data-subject="${esc(P.subject)}" data-body="${esc(P.body)}" data-role="${esc(P.fallbackRole)}" data-company="${esc(P.fallbackCompany)}">
        <h2 class="mono-label">${esc(P.form)} · MW-<span class="js-year">2026</span></h2>
        <label>${esc(P.company)}<input name="company" type="text" autocomplete="organization" placeholder="${esc(P.companyPh)}"></label>
        <label>${esc(P.role)}<input name="role" type="text" placeholder="${esc(P.rolePh)}"></label>
        <label>${esc(P.message)}<textarea name="message" rows="4" placeholder="${esc(P.messagePh)}"></textarea></label>
        <button class="btn btn-accent btn-block" type="submit">${esc(P.submit)} ${icon.arrow}</button>
        <p class="small">${esc(P.formNote)}</p>
      </form>
    </div>`;
}

// Small two-lines-merging illustration for the home page.
const miniRoute = `<svg class="mini-route" viewBox="0 0 420 200" aria-hidden="true" focusable="false">
      <path class="ln ln-code" d="M20 50H250C285 50 285 95 320 95H400"/>
      <path class="ln ln-floor" d="M70 150H250C285 150 285 105 320 105H400"/>
      <circle class="stop" cx="20" cy="50" r="8"/><circle class="stop" cx="130" cy="50" r="8"/><circle class="stop" cx="210" cy="50" r="8"/>
      <circle class="stop" cx="70" cy="150" r="8"/><circle class="stop" cx="150" cy="150" r="8"/><circle class="stop" cx="230" cy="150" r="8"/>
      <rect class="stop stop-junction" x="306" y="76" width="28" height="48" rx="14"/>
    </svg>`;

/* ---------- pages ---------- */

export function homePage(L, csp) {
  const H = L.pages.home;
  const featured = ['MW-LAPX-25', 'MW-DEMO', 'MW-BANK-23'].map(code => L.shipments.find(s => s.code === code));
  return layout(L, csp, '', {
    title: L.title, description: L.description, person: true, ticker: true,
    main: c => `<section class="hero" aria-labelledby="hero-title">
  <div class="wrap">
    <p class="dock">${esc(L.hero.dock)}</p>
    <h1 id="hero-title" class="display">${L.hero.title.map((t, i) => `<span class="ln ln-${i}">${esc(t)}</span>`).join(' ')}</h1>
    <div class="hero-grid">
      <p class="lede">${esc(L.hero.lede)}</p>
      <div class="ctas">
        <a class="btn btn-accent" href="${c.root}work/">${esc(L.hero.ctaTrack)} ${icon.arrow}</a>
        <a class="btn btn-line" href="${c.root}contact/">${esc(L.hero.ctaPickup)}</a>
      </div>
    </div>
    ${board(L, c)}
  </div>
</section>
<section class="facts-sec" aria-label="${esc(H.factsLabel)}">
  <div class="wrap">
    <ul class="facts">
      ${H.facts.map(([n, t]) => `<li><strong>${esc(n)}</strong><span>${esc(t)}</span></li>`).join('\n      ')}
    </ul>
  </div>
</section>
<section class="sec" aria-labelledby="featured-title">
  <div class="wrap">
    <div class="sec-head sec-head-row">
      <div><p class="dock">${esc(H.featuredKicker)}</p><h2 id="featured-title">${esc(H.featured)}</h2></div>
      <a class="textlink" href="${c.root}work/">${esc(H.allWork)} ${icon.arrow}</a>
    </div>
    <div class="cards">
      ${featured.map(s => card(L, c, s)).join('\n      ')}
    </div>
  </div>
</section>
<section class="sec sec-alt home-about" aria-labelledby="home-about-title">
  <div class="wrap ha-grid">
    <div>
      <p class="dock">${esc(H.aboutKicker)}</p>
      <h2 id="home-about-title">${esc(H.aboutTitle)}</h2>
      <p class="lede">${esc(H.aboutText)}</p>
      <a class="textlink" href="${c.root}about/">${esc(H.aboutLink)} ${icon.arrow}</a>
    </div>
    ${miniRoute}
  </div>
</section>
<section class="cta-band" aria-labelledby="cta-title">
  <div class="wrap">
    <h2 id="cta-title">${esc(H.ctaTitle)}</h2>
    <p>${esc(H.ctaText)}</p>
    <div class="ctas">
      <a class="btn btn-accent" href="${c.root}contact/">${esc(H.ctaButton)} ${icon.arrow}</a>
      <a class="btn btn-ghost-dark" href="${c.base}${site.cv[L.lang]}" download>${icon.down} ${esc(L.hero.ctaCv)}</a>
    </div>
  </div>
</section>`,
  });
}

export function workPage(L, csp) {
  const W = L.pages.work;
  return layout(L, csp, 'work/', {
    title: W.title, description: W.description,
    main: c => `${pageHead(L, c, { dock: W.dock, h1: W.h1, lede: W.lede })}
<section class="sec sec-tight" aria-label="${esc(W.label)}">
  <div class="wrap">
    ${trackForm(L, c)}
    <h2 class="sr">${esc(W.all)}</h2>
    <div class="cards cards-all">
      ${L.shipments.map(s => card(L, c, s)).join('\n      ')}
    </div>
  </div>
</section>`,
  });
}

export function projectPages(L, csp) {
  const W = L.pages.work;
  const pages = L.shipments.filter(s => s.slug);
  return pages.map((s, i) => {
    const prev = pages[(i - 1 + pages.length) % pages.length], next = pages[(i + 1) % pages.length];
    const sub = `work/${s.slug}/`;
    const html = layout(L, csp, sub, {
      title: `${s.title} | ${L.pages.work.label} | Mark Walusimbi`, description: s.summary,
      main: c => `<div class="wrap crumbs-wrap"><nav class="crumbs" aria-label="${esc(L.crumbsLabel)}"><ol>
      <li><a href="${c.root || './'}">${esc(L.homeLabel)}</a></li>
      <li><a href="${c.root}work/">${esc(W.label)}</a></li>
      <li><span aria-current="page">${esc(s.title)}</span></li>
    </ol></nav></div>
<div class="wrap project">
  ${parcel(L, c, s)}
  <nav class="pn" aria-label="${esc(W.all)}">
    <a class="pn-prev" href="${c.root}work/${prev.slug}/" rel="prev"><span class="mono-label">${icon.back} ${esc(W.prev)}</span><strong>${esc(prev.title)}</strong></a>
    <a class="pn-all" href="${c.root}work/">${esc(W.all)}</a>
    <a class="pn-next" href="${c.root}work/${next.slug}/" rel="next"><span class="mono-label">${esc(W.next)} ${icon.arrow}</span><strong>${esc(next.title)}</strong></a>
  </nav>
</div>`,
    });
    return [sub, html];
  });
}

export function aboutPage(L, csp) {
  const A = L.pages.about;
  return layout(L, csp, 'about/', {
    title: A.title, description: A.description, person: true,
    main: c => `${pageHead(L, c, { dock: A.dock, h1: A.h1, lede: A.lede })}
<nav class="subnav" aria-label="${esc(A.subnavLabel)}">
  <div class="wrap">
    ${A.subnav.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('\n    ')}
  </div>
</nav>
${routeSection(L)}
${skillsSection(L)}
${educationSection(L, c)}`,
  });
}

export function contactPage(L, csp) {
  const P = L.pickup, C = L.pages.contact;
  return layout(L, csp, 'contact/', {
    title: C.title, description: C.description,
    main: c => `${pageHead(L, c, { dock: P.dock, h1: P.title, lede: P.lede })}
<section class="sec sec-tight" aria-label="${esc(C.label)}">
  <div class="wrap">
    ${contactBody(L)}
  </div>
</section>`,
  });
}

export function notFound(langs, csp) {
  const { en, sv } = langs;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>404 · Return to sender · Mark Walusimbi</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23ff5a1f'/%3E%3Ctext x='32' y='42' font-family='monospace' font-size='26' font-weight='700' fill='%2316150f' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="/assets/site.css">
<script>${INIT}</script>
</head>
<body class="nf">
<main class="nf-main">
  <p class="dock">Parcel 404 · Undeliverable</p>
  <h1 class="display"><span>${esc(en.notFound.title)}</span></h1>
  <p class="lede">${esc(en.notFound.text)}</p>
  <p class="lede" lang="sv">${esc(sv.notFound.text)}</p>
  <div class="ctas">
    <a class="btn btn-accent" href="/">${esc(en.notFound.home)} ${icon.arrow}</a>
    <a class="btn btn-line" href="/work/">${esc(en.pages.work.all)}</a>
    <a class="btn btn-line" href="/sv/" lang="sv">${esc(sv.notFound.home)}</a>
  </div>
  ${barcode('RETURN-TO-SENDER-404', 'barcode nf-barcode')}
</main>
</body>
</html>
`;
}

export function redirect(to, csp) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}">
<title>Moved</title>
</head>
<body><p>This page has moved: <a href="${to}">${to}</a></p></body>
</html>
`;
}
