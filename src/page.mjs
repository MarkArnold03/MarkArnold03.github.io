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

const icon = {
  arrow: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  down: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v14M6 12l6 6 6-6M5 21h14"/></svg>',
  ext: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>',
  truck: '<svg class="truck" viewBox="0 0 32 20" aria-hidden="true" focusable="false"><path d="M1 3h18v11H1zM19 7h6l5 5v2h-11z"/><circle cx="7" cy="16" r="3"/><circle cx="24" cy="16" r="3"/></svg>',
  sun: '<svg class="i i-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i i-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  lock: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

const BOARD_W = [4, 14, 14, 10];

function head(L, base, csp) {
  const url = site.url + L.path;
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(L.title)}">
<meta property="og:description" content="${esc(L.description)}">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#efebe3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e0f0c" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23ff5a1f'/%3E%3Ctext x='32' y='42' font-family='monospace' font-size='26' font-weight='700' fill='%2316150f' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${site.url}">
<link rel="alternate" hreflang="sv" href="${site.url}sv/">
<link rel="alternate" hreflang="x-default" href="${site.url}">
<link rel="preload" href="${base}assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/jetbrains-mono-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/site.css">
<script>${INIT}</script>
</head>`;
}

// Runs before first paint: applies the saved shift (theme) and marks JS as available.
export const INIT = "(function(d){d.classList.add('js');try{var s=localStorage.getItem('mw-shift');if(s==='day'||s==='night')d.setAttribute('data-shift',s)}catch(e){}})(document.documentElement)";

function topbar(L, base) {
  return `<a class="skip" href="#main">${esc(L.skip)}</a>
<header class="top">
  <div class="top-in">
    <a class="logo" href="#board"><span class="logo-mark" aria-hidden="true">MW</span><span class="logo-text">${esc(site.name)}<small>${esc(L.logoSub)}</small></span></a>
    <nav class="nav" aria-label="${esc(L.navLabel)}">
      ${L.nav.map(([id, label], i) => `<a href="#${id}"><span aria-hidden="true">0${i + 1}</span>${esc(label)}</a>`).join('\n      ')}
    </nav>
    <div class="tools">
      <span class="clock" title="${esc(L.clockLabel)}"><span class="clock-tz" aria-hidden="true">STO</span> <time class="js-clock">--:--</time></span>
      <a class="lang" href="${base}${L.otherPath}" hreflang="${L.other}" lang="${L.other}" aria-label="${esc(L.otherName)}">${L.otherLabel}</a>
      <button class="shift" type="button" data-day="${esc(L.shift.day)}" data-night="${esc(L.shift.night)}" data-to-day="${esc(L.shift.toDay)}" data-to-night="${esc(L.shift.toNight)}" aria-label="${esc(L.shift.toNight)}">${icon.sun}${icon.moon}<span class="shift-label">${esc(L.shift.day)}</span></button>
    </div>
  </div>
  <div class="ticker" aria-label="${esc(L.tickerLabel)}">
    <div class="ticker-track">
      <p>${L.ticker.map(t => `<span>${esc(t)}</span>`).join('')}</p>
      <p aria-hidden="true">${L.ticker.map(t => `<span>${esc(t)}</span>`).join('')}</p>
    </div>
  </div>
</header>`;
}

function sectionHead(dock, title, lede, id) {
  return `<div class="sec-head">
    <p class="dock">${esc(dock)}</p>
    <h2 id="${id}-title">${esc(title)}</h2>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
  </div>`;
}

function board(L) {
  const cell = (text, w, cls) => `<span class="cell ${cls}" data-w="${w}">${esc(text)}</span>`;
  const rows = L.shipments.map(s => {
    const st = L.status[s.status];
    const alt = s.status === 'boarding' ? ` data-alt="${esc(L.statusAlt.toUpperCase())}"` : '';
    const sr = `${s.board[0]}, ${s.title}, ${s.board[2]}, ${st}`;
    return `<li><a class="row s-${s.status}" href="#${s.code}" data-code="${s.code}"><span class="sr">${esc(sr)}</span><span class="cells" aria-hidden="true">${cell(s.board[0], BOARD_W[0], 'c-year')}${cell(s.board[1], BOARD_W[1], 'c-dest')}${cell(s.board[2], BOARD_W[2], 'c-via')}<span class="cell c-status" data-w="${BOARD_W[3]}"${alt}>${esc(st.toUpperCase())}</span></span></a></li>`;
  }).join('\n      ');
  return `<div class="board" role="group" aria-label="${esc(L.board.label)}">
    <div class="board-top"><span class="board-title">${esc(L.board.head)}</span><span class="board-sub" aria-hidden="true">STOCKHOLM · <time class="js-clock">--:--</time></span></div>
    <div class="board-cols" aria-hidden="true">${L.board.cols.map((c, i) => `<span class="col-${i}">${esc(c)}</span>`).join('')}</div>
    <ol class="board-rows">
      ${rows}
    </ol>
    <p class="board-hint">${esc(L.board.hint)} ${icon.arrow}</p>
  </div>`;
}

function hero(L, base) {
  return `<section id="board" class="hero" aria-labelledby="board-title">
  <div class="wrap">
    <p class="dock">${esc(L.hero.dock)}</p>
    <h1 id="board-title" class="display">${L.hero.title.map((t, i) => `<span class="ln ln-${i}">${esc(t)}</span>`).join(' ')}</h1>
    <div class="hero-grid">
      <p class="lede">${esc(L.hero.lede)}</p>
      <div class="ctas">
        <a class="btn btn-accent" href="#track">${esc(L.hero.ctaTrack)} ${icon.arrow}</a>
        <a class="btn btn-line" href="#pickup">${esc(L.hero.ctaPickup)}</a>
        <a class="btn btn-ghost" href="${base}${site.cv}" download>${icon.down} ${esc(L.hero.ctaCv)}</a>
      </div>
    </div>
    ${board(L)}
  </div>
</section>`;
}

function parcel(L, s, base) {
  const T = L.track;
  const pct = s.status === 'boarding' ? 'p-start' : 'p-done';
  const link = ([href, label]) => {
    const ext = href.startsWith('http');
    return `<a class="btn btn-line btn-sm" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)} ${ext ? icon.ext : icon.arrow}</a>`;
  };
  return `<article class="parcel" id="${s.code}" data-code="${s.code}" tabindex="-1" aria-labelledby="${s.code}-t">
      <header class="parcel-head">
        <div>
          <p class="mono-label">${esc(T.number)}</p>
          <p class="parcel-code">${s.code}</p>
          <h3 id="${s.code}-t">${esc(s.title)}</h3>
        </div>
        <span class="status s-${s.status}">${esc(L.status[s.status])}</span>
      </header>
      <div class="leg ${pct}">
        <div class="leg-end"><span class="mono-label">${esc(T.from)}</span><strong>${esc(s.from)}</strong></div>
        <div class="leg-bar" aria-hidden="true"><i></i>${icon.truck}</div>
        <div class="leg-end leg-to"><span class="mono-label">${esc(T.to)}</span><strong>${esc(s.to)}</strong></div>
      </div>
      <dl class="parcel-meta">${s.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="parcel-body">
        <div>
          <h4 class="mono-label">${esc(T.events)}</h4>
          <ol class="events">${s.events.map(([when, tag, text], i) => `
            <li${i === 0 ? ' class="latest"' : ''}><span class="ev-when">${esc(when || '·')}</span><div><strong class="ev-tag">${esc(tag)}</strong><p>${esc(text)}</p></div></li>`).join('')}
          </ol>
        </div>
        <aside>
          <h4 class="mono-label">${esc(T.contents)}</h4>
          <ul class="tags">${s.contents.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          ${s.note ? `<p class="note">${icon.lock}<span>${esc(s.note)}</span></p>` : ''}
          ${s.links ? `<div class="parcel-links">${s.links.map(link).join('')}</div>` : ''}
          ${barcode(s.code, 'barcode parcel-barcode')}
        </aside>
      </div>
    </article>`;
}

function track(L, base) {
  const T = L.track;
  return `<section id="track" class="sec" aria-labelledby="track-title">
  <div class="wrap">
    ${sectionHead(T.dock, T.title, T.lede, 'track')}
    <div class="tracker">
      <form class="track-form" role="search" data-notfound="${esc(T.notFound)}">
        <label for="track-q" class="mono-label">${esc(T.field)}</label>
        <div class="track-input">
          <input id="track-q" name="q" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="${esc(T.placeholder)}">
          <button class="btn btn-accent" type="submit">${esc(T.button)} ${icon.arrow}</button>
        </div>
        <p class="track-key" aria-hidden="true"><kbd>/</kbd> ${esc(T.key)}</p>
        <p class="track-msg" role="status" aria-live="polite"></p>
      </form>
      <nav class="chips" aria-label="${esc(T.chips)}">
        ${L.shipments.map(s => `<a class="chip s-${s.status}" href="#${s.code}" data-code="${s.code}"><span>${s.code}</span>${esc(s.title)}</a>`).join('\n        ')}
      </nav>
    </div>
    <div class="parcels">
    ${L.shipments.map(s => parcel(L, s, base)).join('\n    ')}
    </div>
  </div>
</section>`;
}

function routeMap(L) {
  const X = slot => 90 + slot * 170;
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

function route(L) {
  const R = L.route;
  const lineName = { code: R.code, floor: R.floor, junction: R.both };
  return `<section id="route" class="sec sec-alt" aria-labelledby="route-title">
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
        <thead><tr>${R.cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${R.rows.map(([y, lane, stop, note]) => `
          <tr><td class="mono">${esc(y)}</td><td><span class="line-tag line-${lane}">${esc(lineName[lane])}</span></td><th scope="row">${esc(stop)}</th><td>${esc(note)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

function manifest(L) {
  const M = L.manifest;
  return `<section id="manifest" class="sec" aria-labelledby="manifest-title">
  <div class="wrap">
    ${sectionHead(M.dock, M.title, M.lede, 'manifest')}
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

function docs(L, base) {
  const D = L.docs;
  const en = L.lang === 'en';
  return `<section id="docs" class="sec sec-alt" aria-labelledby="docs-title">
  <div class="wrap">
    ${sectionHead(D.dock, D.title, D.lede, 'docs')}
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
            <tfoot><tr><th scope="row">${esc(D.total)}</th><td class="num">${courses.reduce((a, c) => a + c[2], 0)}</td><td></td></tr></tfoot>
          </table>
          <p class="small">${esc(D.gradeNote)}</p>
        </details>
        <h4 class="mono-label">${esc(D.pages)}</h4>
        <div class="cert-pages">${site.certPages.map((src, i) => `<figure><a href="${base}${src}" target="_blank" rel="noopener"><img src="${base}${src}" width="1241" height="1754" loading="lazy" decoding="async" alt="${esc(D.pageAlt[i])}"></a><figcaption>${esc(D.pageCap[i])}</figcaption></figure>`).join('')}</div>
        <p class="note">${icon.lock}<span>${esc(D.redacted)}</span></p>
      </article>
      <article class="doc doc-cv">
        <header class="doc-head"><span class="mono-label">${esc(D.cvKind)}</span><h3>${esc(D.cvHead)}</h3></header>
        <dl class="doc-fields">${D.cvFields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <a class="btn btn-accent btn-block" href="${base}${site.cv}" download>${icon.down} ${esc(D.cvButton)}</a>
        ${barcode('MW-CV-2026', 'barcode doc-barcode')}
        <p class="mono-label doc-no">MW-CV-2026 · ${esc(site.name.toUpperCase())}</p>
      </article>
    </div>
  </div>
</section>`;
}

function pickup(L) {
  const P = L.pickup;
  return `<section id="pickup" class="sec" aria-labelledby="pickup-title">
  <div class="wrap">
    ${sectionHead(P.dock, P.title, P.lede, 'pickup')}
    <div class="pickup">
      <div class="lines">
        <h3 class="mono-label">${esc(P.lines)}</h3>
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
        <h3 class="mono-label">${esc(P.form)} · MW-${new Date().getFullYear()}</h3>
        <label>${esc(P.company)}<input name="company" type="text" autocomplete="organization" placeholder="${esc(P.companyPh)}"></label>
        <label>${esc(P.role)}<input name="role" type="text" placeholder="${esc(P.rolePh)}"></label>
        <label>${esc(P.message)}<textarea name="message" rows="4" placeholder="${esc(P.messagePh)}"></textarea></label>
        <button class="btn btn-accent btn-block" type="submit">${esc(P.submit)} ${icon.arrow}</button>
        <p class="small">${esc(P.formNote)}</p>
      </form>
    </div>
  </div>
</section>`;
}

function footer(L) {
  const F = L.footer;
  return `<footer class="label-foot">
  <div class="wrap">
    <div class="ship-label">
      <div class="sl-grid">
        <div><span class="mono-label">${esc(F.from)}</span><p>${nl2br(F.fromVal)}</p></div>
        <div><span class="mono-label">${esc(F.to)}</span><p>${esc(F.toVal)}</p></div>
        <div><span class="mono-label">${esc(F.service)}</span><p>${esc(F.serviceVal)}</p></div>
      </div>
      ${barcode('MARKARNOLD03.GITHUB.IO', 'barcode foot-barcode')}
      <p class="mono-label sl-no">MW-2026-PORTFOLIO · © <span class="js-year">2026</span> ${esc(site.name.toUpperCase())}</p>
    </div>
    <p class="built">${esc(F.built)}</p>
  </div>
</footer>`;
}

export function page(L, csp) {
  const base = L.path ? '../' : '';
  return `${head(L, base, csp)}
<body>
${topbar(L, base)}
<main id="main">
${hero(L, base)}
${track(L, base)}
${route(L)}
${manifest(L)}
${docs(L, base)}
${pickup(L)}
</main>
${footer(L)}
<div class="toast" role="status" aria-live="polite"></div>
<script src="${base}assets/site.js" defer></script>
</body>
</html>
`;
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
