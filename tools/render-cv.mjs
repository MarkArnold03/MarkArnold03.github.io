// Prints tools/cv-en.html to assets/docs/CV_Mark_Walusimbi_EN.pdf with headless Chromium.
// Usage: npm run cv
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(root, 'tools/cv-en.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: join(root, 'assets/docs/CV_Mark_Walusimbi_EN.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
await browser.close();
console.log('wrote assets/docs/CV_Mark_Walusimbi_EN.pdf');
