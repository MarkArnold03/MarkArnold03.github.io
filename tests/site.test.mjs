// Browser tests for the portfolio. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let server, browser;
before(async () => { server = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

// Opens a page and records console errors, page errors, CSP violations and failed requests.
async function open(path, { viewport = VIEWPORTS.desktop, ...opts } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', ...opts });
  const page = await context.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/does-not-exist')) problems.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
    e => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`)));
  await page.goto(server.url + path, { waitUntil: 'networkidle' });
  return { page, context, problems };
}

const shownParcel = page => page.evaluate(() => [...document.querySelectorAll('.parcel')].filter(p => !p.hidden).map(p => p.dataset.code).join());

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  for (const path of ['', 'sv/', 'does-not-exist']) {
    test(`${path || 'home'} renders cleanly (${name})`, async () => {
      const { page, context, problems } = await open(path, { viewport });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.equal(overflow, 0, 'no horizontal scrolling');
      // The 404 page is served with status 404 by design; Chrome logs that as an error.
      const expected = m => path === 'does-not-exist' && m.includes('status of 404');
      assert.deepEqual(problems.filter(m => !expected(m)), []);
      await context.close();
    });
  }
}

test('every same-origin link, image and download resolves', async () => {
  const { page, context } = await open('');
  const urls = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href], img[src], link[href], script[src]')]
    .map(e => (e.href || e.src).split('#')[0]).filter(u => u.startsWith(location.origin)))]);
  for (const u of urls) {
    const res = await fetch(u);
    assert.equal(res.status, 200, u);
  }
  await context.close();
});

test('tracker finds shipments by code, alias and chip', async () => {
  const { page, context } = await open('');
  assert.equal(await shownParcel(page), 'MW-LAPX-25');
  for (const [q, want] of [['mw-bank-23', 'MW-BANK-23'], ['mwkyh24', 'MW-KYH-24'], ['redriver', 'MW-RDRV-24'], ['hire', 'MW-NEXT-26']]) {
    await page.fill('#track-q', q);
    await page.press('#track-q', 'Enter');
    assert.equal(await shownParcel(page), want, q);
    assert.equal(await page.evaluate(() => location.hash), '#' + want);
  }
  await page.fill('#track-q', 'nonsense');
  await page.press('#track-q', 'Enter');
  assert.match(await page.textContent('.track-msg'), /nonsense/);
  await page.click('.chip[data-code="MW-RROCK"]');
  assert.equal(await shownParcel(page), 'MW-RROCK');
  await context.close();
});

test('departure board row opens its shipment', async () => {
  const { page, context } = await open('');
  await page.click('.row[data-code="MW-KYH-24"]');
  await page.waitForTimeout(1000);
  assert.equal(await shownParcel(page), 'MW-KYH-24');
  const top = await page.evaluate(() => document.querySelector('#track').getBoundingClientRect().top);
  assert.ok(Math.abs(top) < 200, `tracker scrolled into view (${top})`);
  await context.close();
});

test('deep link opens a shipment and language switch keeps it', async () => {
  const { page, context } = await open('#MW-BANK-23');
  assert.equal(await shownParcel(page), 'MW-BANK-23');
  await page.click('.lang');
  await page.waitForLoadState('networkidle');
  assert.ok(page.url().endsWith('/sv/#MW-BANK-23'), page.url());
  assert.equal(await page.getAttribute('html', 'lang'), 'sv');
  assert.equal(await shownParcel(page), 'MW-BANK-23');
  await context.close();
});

test('day/night shift is remembered', async () => {
  const { page, context } = await open('', { colorScheme: 'light' });
  await page.click('.shift');
  assert.equal(await page.getAttribute('html', 'data-shift'), 'night');
  await page.goto(server.url + 'sv/', { waitUntil: 'networkidle' });
  assert.equal(await page.getAttribute('html', 'data-shift'), 'night');
  assert.equal(await page.textContent('.shift-label'), 'Nattskift');
  await context.close();
});

test('"/" jumps to the tracker', async () => {
  const { page, context } = await open('');
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'track-q');
  await context.close();
});

test('copy button copies the email address', async () => {
  const { page, context } = await open('');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('.js-copy');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'markanorld0@gmail.com');
  await context.close();
});

test('each language offers its own CV', async () => {
  for (const [path, file] of [['', 'CV_Mark_Walusimbi_EN.pdf'], ['sv/', 'CV_Mark_Walusimbi.pdf']]) {
    const { page, context } = await open(path);
    assert.ok((await page.getAttribute('.hero a[download]', 'href')).endsWith(file), path);
    await context.close();
  }
});

test('content is readable without JavaScript', async () => {
  const { page, context } = await open('', { javaScriptEnabled: false });
  const visible = await page.evaluate(() => [...document.querySelectorAll('.parcel')].filter(p => p.offsetHeight > 0).length);
  assert.equal(visible, 6, 'all shipments visible');
  await context.close();
});

test('old URLs redirect to the new sections', async () => {
  for (const [from, to] of [['work/lapx.html', '/#MW-LAPX-25'], ['about.html', '/#route'], ['sv/exam.html', '/sv/#docs']]) {
    const html = await (await fetch(server.url + from)).text();
    assert.ok(html.includes(`url=https://markarnold03.github.io${to}`), from);
  }
});

test('works offline once visited (service worker)', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  for (const path of ['', 'sv/']) {
    await page.goto(server.url + path);
    assert.match(await page.title(), /Mark Walusimbi/, path);
  }
  await context.close();
});
