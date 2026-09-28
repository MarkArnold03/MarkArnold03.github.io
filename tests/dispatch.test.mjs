// Browser tests for the dispatch demo. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

let server, browser;
before(async () => { server = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

async function openDemo(path = 'dispatch/') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  await page.goto(server.url + path, { waitUntil: 'networkidle' });
  await page.click('.d-seg[data-speed="16"]');
  return { page, context, problems };
}
const read = page => page.evaluate(() => ({
  delivered: Number(document.querySelector('.k-delivered').textContent),
  offline: !document.querySelector('.d-offline').hidden,
  stale: document.querySelectorAll('.truck.is-stale').length,
  synced: document.querySelectorAll('.d-feed em').length,
}));
const outboxRows = page => page.evaluate(() => new Promise((resolve, reject) => {
  const req = indexedDB.open('mw-dispatch-demo', 1);
  req.onsuccess = () => { const c = req.result.transaction('outbox').objectStore('outbox').count(); c.onsuccess = () => resolve(c.result); };
  req.onerror = () => reject(req.error);
}));

test('trucks deliver jobs over time', async () => {
  const { page, context, problems } = await openDemo();
  await page.waitForFunction(() => Number(document.querySelector('.k-delivered').textContent) >= 2, null, { timeout: 15000 });
  const feed = await page.$$eval('.d-feed li', els => els.map(e => e.textContent).join('\n'));
  assert.match(feed, /assigned to T-0\d/);
  assert.match(feed, /delivered J-1\d{3}/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('cutting the connection queues truck events in IndexedDB and reconnecting replays them', async () => {
  const { page, context, problems } = await openDemo();
  await page.waitForTimeout(800);
  await page.click('.d-net');
  await page.waitForFunction(() => document.querySelector('.d-outbox')?.textContent.match(/[1-9]/), null, { timeout: 15000 });
  const offline = await read(page);
  assert.ok(offline.offline, 'offline banner shown');
  assert.equal(offline.stale, 6, 'map shows last known positions');
  const queued = await outboxRows(page);
  assert.ok(queued > 0, 'events stored in IndexedDB');
  await page.click('.d-net');
  await page.waitForTimeout(400);
  const online = await read(page);
  assert.equal(online.offline, false);
  assert.ok(online.synced >= queued, `replayed events are marked synced (${online.synced} >= ${queued})`);
  assert.equal(await outboxRows(page), 0, 'outbox emptied');
  assert.deepEqual(problems, []);
  await context.close();
});

test('manual dispatch: pick a job, then a free truck', async () => {
  const { page, context } = await openDemo();
  await page.uncheck('.d-auto');
  await page.click('.d-new');
  // Wait for a truck to finish its job and become free.
  await page.waitForSelector('.d-truck.is-idle', { timeout: 20000 });
  await page.click('.d-seg[data-speed="1"]');
  const job = await page.getAttribute('.d-job', 'data-job');
  await page.click(`.d-job[data-job="${job}"]`);
  assert.match(await page.textContent('.d-hint'), new RegExp(job));
  const truck = await page.getAttribute('.d-truck.is-idle', 'data-truck');
  await page.click(`.d-truck[data-truck="${truck}"]`);
  const feed = await page.$$eval('.d-feed li', els => els.map(e => e.textContent).join('\n'));
  assert.ok(feed.includes(`${job} assigned to ${truck}`), feed.split('\n')[0]);
  await context.close();
});

test('reset starts the same run again', async () => {
  const { page, context } = await openDemo();
  await page.waitForTimeout(1500);
  await page.click('.d-run'); // pause, then reset
  await page.click('.d-reset');
  assert.equal(await page.textContent('.d-clock'), '07:00');
  assert.equal((await read(page)).delivered, 0);
  const firstJob = await page.$$eval('.d-feed li', els => els.at(-1).textContent);
  assert.match(firstJob, /J-1001/);
  await context.close();
});

test('Swedish demo is translated', async () => {
  const { page, context } = await openDemo('sv/dispatch/');
  assert.equal(await page.getAttribute('html', 'lang'), 'sv');
  assert.equal(await page.textContent('.d-net'), 'Bryt anslutning');
  const feed = await page.$$eval('.d-feed li', els => els.map(e => e.textContent).join('\n'));
  assert.match(feed, /Nytt jobb J-10\d\d/);
  await context.close();
});
