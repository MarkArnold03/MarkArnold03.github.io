// The dispatch demo page (/dispatch/ and /sv/dispatch/).
import { esc, icon, layout } from './page.mjs';
import { nodes, edges, water, trucks } from './dispatch-data.mjs';

const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

function staticMap(D) {
  const roads = edges.map(([a, b]) => `M${byId[a].x} ${byId[a].y}L${byId[b].x} ${byId[b].y}`).join('');
  const places = nodes.map(n => `<g class="place${n.depot ? ' depot' : ''}">
        ${n.depot ? `<rect x="${n.x - 13}" y="${n.y - 13}" width="26" height="26" rx="4"/>` : `<circle cx="${n.x}" cy="${n.y}" r="5"/>`}
        <text x="${n.x + (n.dx || 0)}" y="${n.y + n.dy}"${n.dx ? ' text-anchor="start"' : ''}>${esc(n.name)}${n.depot ? ` · ${esc(D.legend.depot)}` : ''}</text>
      </g>`).join('\n      ');
  return `<svg class="d-svg" viewBox="0 0 1000 640" role="img" aria-labelledby="d-map-t">
      <title id="d-map-t">${esc(D.mapLabel)}</title>
      <g class="water">${water.map(([d, w]) => `<path d="${d}" stroke-width="${w}"/>`).join('')}</g>
      <path class="roads-casing" d="${roads}"/>
      <path class="roads" d="${roads}"/>
      <path class="d-route" d=""/>
      <g class="places">
      ${places}
      </g>
      <g class="d-jobs"></g>
      <g class="d-trucks"></g>
    </svg>`;
}

export function dispatchPage(L, csp) {
  const D = L.demo;
  // Everything the script needs: the road graph, trucks and interface text.
  const data = JSON.stringify({ nodes, edges, trucks, t: D }).replace(/</g, '\\u003c');
  return layout(L, csp, 'dispatch/', {
    title: D.title, description: D.description, bodyClass: 'demo-page', scripts: ['assets/dispatch.js'],
    main: c => `<section class="demo-hero" aria-labelledby="demo-title">
  <div class="wrap">
    <p class="dock">${esc(D.dock)}</p>
    <h1 id="demo-title" class="display">${esc(D.h1)}</h1>
    <p class="lede">${esc(D.lede)}</p>
    <p class="try">${esc(D.tryIt)}</p>
  </div>
</section>
<section class="demo-app" aria-label="${esc(D.h1)}">
  <div class="wrap">
    <div class="dispatch">
      <div class="d-bar" role="toolbar" aria-label="${esc(D.controls)}">
        <button class="d-btn d-run" type="button" aria-pressed="true" data-run="${esc(D.run)}" data-pause="${esc(D.pause)}">${esc(D.pause)}</button>
        <div class="d-speed" role="group" aria-label="${esc(D.speed)}">
          <span class="mono-label">${esc(D.speed)}</span>
          ${[1, 4, 16].map(n => `<button class="d-btn d-seg" type="button" data-speed="${n}" aria-pressed="${n === 4}">${n}×</button>`).join('')}
        </div>
        <label class="d-switch"><input type="checkbox" class="d-auto" checked><span>${esc(D.auto)}</span></label>
        <button class="d-btn d-new" type="button">+ ${esc(D.newJob)}</button>
        <button class="d-btn d-net" type="button" aria-pressed="false" data-cut="${esc(D.cut)}" data-reconnect="${esc(D.reconnect)}">${esc(D.cut)}</button>
        <button class="d-btn d-reset" type="button">${esc(D.reset)}</button>
        <span class="d-clock mono" aria-hidden="true">07:00</span>
      </div>
      <p class="d-hint" role="status" aria-live="polite"></p>
      <div class="d-grid">
        <div class="d-map">
          ${staticMap(D)}
          <p class="d-offline" hidden><span class="d-offline-dot"></span><span class="d-offline-text"></span></p>
          <ul class="d-legend" aria-hidden="true">
            <li><i class="lg-depot"></i>${esc(D.legend.depot)}</li>
            <li><i class="lg-pickup"></i>${esc(D.legend.pickup)}</li>
            <li><i class="lg-drop"></i>${esc(D.legend.drop)}</li>
            <li><i class="lg-truck"></i>${esc(D.legend.truck)}</li>
          </ul>
        </div>
        <aside class="d-side">
          <dl class="d-kpis">
            <div><dt>${esc(D.kpi.waiting)}</dt><dd class="k-waiting">0</dd></div>
            <div><dt>${esc(D.kpi.active)}</dt><dd class="k-active">0</dd></div>
            <div><dt>${esc(D.kpi.delivered)}</dt><dd class="k-delivered">0</dd></div>
            <div><dt>${esc(D.kpi.avgWait)}</dt><dd class="k-wait">–</dd></div>
          </dl>
          <section class="d-panel">
            <h2 class="mono-label">${esc(D.queue)} <span class="d-count q-count">0</span></h2>
            <ul class="d-queue"><li class="d-empty">${esc(D.empty)}</li></ul>
          </section>
          <section class="d-panel">
            <h2 class="mono-label">${esc(D.fleet)}</h2>
            <ul class="d-fleet">${trucks.map(t => `<li><button type="button" class="d-truck" data-truck="${t.id}"><b>${t.id}</b><span class="d-driver">${esc(t.driver)}</span><span class="d-state">${esc(t.online ? D.status.idle : D.status.off)}</span></button></li>`).join('')}</ul>
          </section>
        </aside>
        <section class="d-panel d-feed-panel">
          <h2 class="mono-label">${esc(D.feed)} <span class="d-outbox" hidden></span></h2>
          <div role="log" aria-live="off" aria-label="${esc(D.feed)}"><ol class="d-feed"></ol></div>
        </section>
      </div>
    </div>
    <script type="application/json" id="d-data">${data}</script>
  </div>
</section>
<section class="demo-how sec" aria-labelledby="how-title">
  <div class="wrap">
    <h2 id="how-title" class="mono-label how-title">${esc(D.how)}</h2>
    <div class="how-grid">
      ${D.howItems.map(([t, d], i) => `<article><span class="mono-label">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('\n      ')}
    </div>
    <p class="note">${icon.lock}<span>${esc(D.note)}</span></p>
    <div class="ctas demo-ctas">
      <a class="btn btn-accent" href="${c.root}work/">${esc(D.seeTracker)} ${icon.arrow}</a>
      <a class="btn btn-line" href="${c.root}contact/">${esc(L.pages.home.ctaButton)}</a>
    </div>
  </div>
</section>`,
  });
}
