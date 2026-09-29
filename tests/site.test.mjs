// Browser tests for the portfolio pages. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let server, browser;
before(async () => { server = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const PAGES = ['', 'work/', 'work/lapx/', 'work/redriver/', 'work/bankwebapp/', 'work/rising-rock/', 'about/', 'contact/', 'dispatch/'];

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

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  for (const path of [...PAGES, ...PAGES.map(p => 'sv/' + p), 'does-not-exist']) {
    test(`${path || 'home'} renders cleanly (${name})`, async () => {
      const { page, context, problems } = await open(path, { viewport });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.equal(overflow, 0, 'no horizontal scrolling');
      if (path !== 'does-not-exist') assert.equal(await page.locator('h1').count(), 1, 'exactly one h1');
      // The 404 page is served with status 404 by design; Chrome logs that as an error.
      const expected = m => path === 'does-not-exist' && m.includes('status of 404');
      assert.deepEqual(problems.filter(m => !expected(m)), []);
      await context.close();
    });
  }
}

test('every internal link on every page resolves (crawl from the home page)', async () => {
  const seen = new Set(), queue = [server.url, server.url + 'sv/'];
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await fetch(url);
    assert.equal(res.status, 200, url);
    if (!(res.headers.get('content-type') || '').includes('text/html')) continue;
    await page.goto(url);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href], link[rel=stylesheet], script[src], img[src]')]
      .map(e => (e.href || e.src).split('#')[0]).filter(u => u.startsWith(location.origin)));
    for (const l of links) if (!seen.has(l)) queue.push(l);
  }
  // Every page must be reachable by following links from the home page.
  for (const p of [...PAGES, ...PAGES.map(x => 'sv/' + x)]) assert.ok(seen.has(server.url + p), `reachable: /${p}`);
  await context.close();
});

test('header: current page is marked and the CV button downloads the right language', async () => {
  for (const [path, current, cv] of [['work/lapx/', 'work/', 'CV_Mark_Walusimbi_EN.pdf'], ['sv/about/', 'about/', 'CV_Mark_Walusimbi.pdf'], ['contact/', 'contact/', 'CV_Mark_Walusimbi_EN.pdf']]) {
    const { page, context } = await open(path);
    const marked = await page.$$eval('.nav a[aria-current="page"]', as => as.map(a => a.getAttribute('href')));
    assert.equal(marked.length, 1, path);
    assert.ok(marked[0].endsWith(current), `${path}: ${marked[0]}`);
    assert.ok((await page.getAttribute('.btn-cv', 'href')).endsWith(cv), path);
    await context.close();
  }
});

test('departure board rows open the project pages', async () => {
  const { page, context } = await open('');
  await page.click('.row[data-code="MW-BANK-23"]');
  await page.waitForURL(/\/work\/bankwebapp\/$/);
  assert.match(await page.textContent('h1'), /BankWebApp/i);
  await context.close();
});

test('tracking search on the work page navigates to the project', async () => {
  const { page, context } = await open('work/');
  for (const [q, url] of [['mw-rdrv-24', /\/work\/redriver\/$/], ['rising rock', /\/work\/rising-rock\/$/], ['demo', /\/dispatch\/$/], ['hire', /\/contact\/$/]]) {
    await page.goto(server.url + 'work/');
    await page.fill('#track-q', q);
    await page.press('#track-q', 'Enter');
    await page.waitForURL(url);
  }
  await page.goto(server.url + 'work/');
  await page.fill('#track-q', 'nonsense');
  await page.press('#track-q', 'Enter');
  assert.match(await page.textContent('.track-msg'), /nonsense/);
  await context.close();
});

test('project pages have breadcrumbs and previous/next navigation', async () => {
  const { page, context } = await open('work/lapx/');
  const crumbs = await page.$$eval('.crumbs li', lis => lis.map(li => li.textContent.trim()));
  assert.deepEqual(crumbs, ['Home', 'Work', 'LAPX platform']);
  await page.click('.pn-next');
  await page.waitForURL(/\/work\/redriver\/$/);
  await page.click('.pn-prev');
  await page.waitForURL(/\/work\/lapx\/$/);
  await context.close();
});

test('language switch keeps you on the same page', async () => {
  const { page, context } = await open('work/rising-rock/');
  await page.click('.lang');
  await page.waitForURL(/\/sv\/work\/rising-rock\/$/);
  assert.equal(await page.getAttribute('html', 'lang'), 'sv');
  await page.click('.lang');
  await page.waitForURL(/127\.0\.0\.1:\d+\/work\/rising-rock\/$/);
  await context.close();
});

test('old links forward to the new pages', async () => {
  for (const [from, to] of [['work/lapx.html', '/work/lapx/'], ['about.html', '/about/'], ['sv/exam.html', '/sv/about/#education']]) {
    const html = await (await fetch(server.url + from)).text();
    assert.ok(html.includes(`url=https://markarnold03.github.io${to}`), from);
  }
  const { page, context } = await open('#MW-BANK-23');
  await page.waitForURL(/\/work\/bankwebapp\/$/);
  await context.close();
});

test('about page sub-menu jumps to sections and highlights them', async () => {
  const { page, context } = await open('about/');
  await page.click('.subnav a[href="#education"]');
  await page.waitForTimeout(1200);
  assert.equal(await page.textContent('.subnav a.on'), (await page.textContent('.subnav a[href="#education"]')));
  const top = await page.evaluate(() => document.querySelector('#education-title').getBoundingClientRect().top);
  assert.ok(top > 0 && top < 500, `section heading visible (${top})`);
  await context.close();
});

test('day/night shift is remembered across pages', async () => {
  const { page, context } = await open('', { colorScheme: 'light' });
  await page.click('.shift');
  assert.equal(await page.getAttribute('html', 'data-shift'), 'night');
  await page.goto(server.url + 'sv/work/', { waitUntil: 'networkidle' });
  assert.equal(await page.getAttribute('html', 'data-shift'), 'night');
  assert.equal(await page.textContent('.shift-label'), 'Nattskift');
  await context.close();
});

test('"/" jumps to the tracking search on the work page', async () => {
  const { page, context } = await open('work/');
  await page.keyboard.press('/');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'track-q');
  await context.close();
});

test('copy button on the contact page copies the email address', async () => {
  const { page, context } = await open('contact/');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('.js-copy');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'markanorld0@gmail.com');
  await context.close();
});

test('pages are readable without JavaScript', async () => {
  const { page, context } = await open('work/', { javaScriptEnabled: false });
  assert.equal(await page.locator('.ship-card').count(), 7);
  await page.goto(server.url + 'work/lapx/');
  assert.ok(await page.locator('.events li').count() > 5);
  await context.close();
});

test('works offline once visited (service worker)', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  for (const path of ['', 'work/lapx/', 'sv/about/', 'contact/']) {
    await page.goto(server.url + path);
    assert.match(await page.title(), /Mark Walusimbi/, path);
  }
  await context.close();
});
