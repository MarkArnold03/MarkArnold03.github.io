// Renders the social preview cards and app icons with headless Chromium.
// Usage: npm run images   (writes to assets/img/)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = f => pathToFileURL(join(root, 'assets/fonts', f)).href;
const out = join(root, 'assets/img');
mkdirSync(out, { recursive: true });

const base = `
@font-face{font-family:A;src:url(${font('archivo.woff2')});font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:M;src:url(${font('jetbrains-mono-700.woff2')});font-weight:700}
@font-face{font-family:M;src:url(${font('jetbrains-mono-400.woff2')});font-weight:400}
*{box-sizing:border-box;margin:0}
body{width:var(--w);height:var(--h);overflow:hidden}`;

const flapRow = (text, w, color = '#ffc83d') =>
  `<div class="cell">${[...text.padEnd(w)].map(c => `<span style="color:${color}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>`;

const og = ({ kicker, lines, rows, status }) => `<!doctype html><html><head><style>${base}
body{--w:1200px;--h:630px;background:#efebe3;font-family:A;color:#16150f;position:relative;
  background-image:linear-gradient(rgba(22,21,15,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(22,21,15,.05) 1px,transparent 1px);background-size:40px 40px}
.top{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:16px}
.mark{width:56px;height:56px;background:#ff5a1f;border-radius:4px;box-shadow:inset 0 0 0 2px #16150f;display:grid;place-items:center;font:700 21px M}
.name{font-weight:750;font-stretch:88%;font-size:26px;line-height:1.1}
.name small{display:block;font:400 15px M;letter-spacing:.06em;color:#6b6558;text-transform:uppercase}
.kicker{position:absolute;left:64px;top:156px;font:400 17px M;letter-spacing:.12em;color:#b23a0c;text-transform:uppercase;display:flex;gap:14px;align-items:center}
.kicker:before{content:"";width:40px;height:14px;background:repeating-linear-gradient(-45deg,#ff5a1f 0 6px,transparent 6px 12px);border:1.5px solid #ff5a1f}
h1{position:absolute;left:60px;top:196px;font-stretch:66%;font-weight:850;text-transform:uppercase;font-size:78px;line-height:.9}
h1 span{display:block}
h1 .tape{display:table;background:#ff5a1f;padding:0 12px 4px;margin:6px 0 8px -6px;box-shadow:7px 7px 0 #16150f;transform:rotate(-1.4deg)}
.board{position:absolute;right:48px;top:188px;width:452px;background:#0b0b0a;border-radius:12px;padding:22px 20px 18px;box-shadow:0 30px 50px -28px rgba(0,0,0,.7)}
.bt{font-stretch:66%;font-weight:850;font-size:30px;color:#f4f1ea;text-transform:uppercase;letter-spacing:.03em;border-bottom:1px solid #262623;padding-bottom:10px;margin-bottom:12px}
.row{display:flex;gap:10px;margin:7px 0}
.cell{display:flex;gap:2px}
.cell span{width:15px;height:23px;display:grid;place-items:center;background:linear-gradient(#1f1f1d 50%,#191917 50%);border-radius:2px;font:700 14px M}
.foot{position:absolute;left:0;right:0;bottom:0;height:64px;background:#16150f;color:#efebe3;display:flex;align-items:center;justify-content:space-between;padding:0 64px;font:400 18px M;letter-spacing:.08em;text-transform:uppercase}
.foot b{color:#ff5a1f;font-weight:700}
</style></head><body>
<div class="top"><div class="mark">MW</div><div class="name">Mark Walusimbi<small>Fullstack · .NET · C# · JS</small></div></div>
<p class="kicker">${kicker}</p>
<h1>${lines.map((l, i) => `<span${i === 1 ? ' class="tape"' : ''}>${l}</span>`).join('')}</h1>
<div class="board"><div class="bt">${rows.title}</div>
${rows.items.map(([d, s, c]) => `<div class="row">${flapRow(d, 14)}${flapRow(s, 10, c)}</div>`).join('')}
</div>
<div class="foot"><span>markarnold03.github.io</span><span><b>●</b> ${status}</span></div>
</body></html>`;

const icon = ({ size, pad }) => `<!doctype html><html><head><style>${base}
body{--w:${size}px;--h:${size}px;background:#ff5a1f;display:grid;place-items:center}
div{width:${size - pad * 2}px;height:${size - pad * 2}px;display:grid;place-items:center;font:700 ${Math.round((size - pad * 2) * 0.42)}px M;color:#16150f;letter-spacing:-.02em}
</style></head><body><div>MW</div></body></html>`;

const jobs = [
  ['og-en.png', 1200, 630, og({
    kicker: 'Fullstack developer · Stockholm',
    lines: ['From the', 'warehouse floor', 'to production.'],
    rows: { title: 'Departures', items: [['LAPX PLATFORM', 'DELIVERED', '#7ee2a1'], ['KYH DEGREE', 'DELIVERED', '#7ee2a1'], ['REDRIVER', 'DELIVERED', '#7ee2a1'], ['YOUR TEAM', 'BOARDING', '#ff8a3d']] },
    status: 'Open to work',
  })],
  ['og-sv.png', 1200, 630, og({
    kicker: 'Fullstack-utvecklare · Stockholm',
    lines: ['Från', 'lagergolvet', 'till produktion.'],
    rows: { title: 'Avgångar', items: [['LAPX-PLATTFORM', 'LEVERERAD', '#7ee2a1'], ['KYH-EXAMEN', 'LEVERERAD', '#7ee2a1'], ['REDRIVER', 'LEVERERAD', '#7ee2a1'], ['DITT TEAM', 'PÅSTIGNING', '#ff8a3d']] },
    status: 'Öppen för jobb',
  })],
  ['icon-192.png', 192, 192, icon({ size: 192, pad: 0 })],
  ['icon-512.png', 512, 512, icon({ size: 512, pad: 0 })],
  ['icon-maskable-512.png', 512, 512, icon({ size: 512, pad: 92 })],
  ['apple-touch-icon.png', 180, 180, icon({ size: 180, pad: 14 })],
];

const browser = await chromium.launch();
const page = await browser.newPage();
const tmp = join(root, 'tools/.render.html');
for (const [name, w, h, html] of jobs) {
  writeFileSync(tmp, html);
  await page.setViewportSize({ width: w, height: h });
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, name) });
  console.log('wrote assets/img/' + name);
}
rmSync(tmp);
await browser.close();
