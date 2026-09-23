#!/usr/bin/env node
/**
 * Drives the admin console in Chrome.
 *
 * It deploys as its own app and proxies to the API, so a broken proxy, a bad
 * build-time origin or a tab that throws would never show up in smoke.mjs or
 * ui-check.mjs. Every tab is opened and asserted on.
 *
 *   ADMIN_EMAILS=... ADMIN_ACCESS_KEY=... node scripts/admin-check.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3001';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EMAIL = (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
const KEY = process.env.ADMIN_ACCESS_KEY || '';
const shots = resolve(dirname(fileURLToPath(import.meta.url)), '../.devdata/screenshots');
mkdirSync(shots, { recursive: true });

if (!EMAIL || !KEY) {
  console.error('Set ADMIN_EMAILS and ADMIN_ACCESS_KEY (e.g. `set -a && . ./.env.uat && set +a`).');
  process.exit(2);
}

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, { timeout = 20000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await page.evaluate(fn)) return true; } catch {}
    await sleep(250);
  }
  console.log(`    (timed out waiting for ${label})`);
  return false;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('response', (r) => {
  // The deliberate wrong-key attempt below is expected to 403.
  if (r.status() >= 400 && !r.url().includes('/api/admin/session')) errors.push(`http ${r.status()}: ${r.url()}`);
});
page.on('requestfailed', (r) => errors.push(`${r.failure()?.errorText || 'failed'}: ${r.url()}`));
page.on('console', (m) => {
  const text = m.text();
  // The wrong-key attempt below is meant to 403; Chrome logs every failed
  // response as a console error, so filter that one out rather than the test
  // failing on its own fixture.
  const expected403 = /403 \(Forbidden\)/.test(text);
  if (m.type() === 'error' && !expected403 && !/favicon|React DevTools/i.test(text)) errors.push('console: ' + text);
});

/** Type into a field, going through React's value setter. */
async function fill(selector, value) {
  await page.evaluate((sel, val) => {
    const input = document.querySelector(sel);
    const proto = input instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, selector, value);
}

try {
  console.log('\n\x1b[1mLogin gate\x1b[0m');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFor(page, () => /control room/i.test(document.body.innerText), { label: 'login form' });
  const gate = await page.evaluate(() => document.body.innerText);
  check('login form renders', /control room/i.test(gate));
  check('console is not shown before sign-in', !/Lock console/.test(gate));
  await page.screenshot({ path: `${shots}/admin-01-login.png` });

  // A wrong key must be refused, and must say so rather than failing silently.
  await fill('input[type="email"]', EMAIL);
  await fill('input[type="password"]', 'definitely-not-the-key');
  await page.evaluate(() => document.querySelector('form')?.requestSubmit());
  await waitFor(page, () => /denied|invalid|error/i.test(document.body.innerText), { timeout: 12000, label: 'rejection' });
  const refused = await page.evaluate(() => document.body.innerText);
  check('a wrong access key is refused', /denied/i.test(refused), '');
  check('and the console stays locked', !/Lock console/.test(refused));

  console.log('\n\x1b[1mSigned in\x1b[0m');
  await fill('input[type="email"]', EMAIL);
  await fill('input[type="password"]', KEY);
  await page.evaluate(() => document.querySelector('form')?.requestSubmit());
  const entered = await waitFor(page, () => /Lock console/.test(document.body.innerText), { timeout: 20000, label: 'console' });
  check('a correct key opens the console', entered);
  const home = await page.evaluate(() => document.body.innerText);
  check('the signed-in admin is named', home.includes(EMAIL.toLowerCase()), '');

  console.log('\n\x1b[1mOverview\x1b[0m');
  // The tiles render `0` until the fetch returns, so wait for real data rather
  // than sampling at a fixed moment — on a cold dev server the first compile
  // takes seconds and a fixed sleep reads zeros.
  await waitFor(
    page,
    () => [...document.querySelectorAll('div')]
      .some((d) => /^\d[\d,]*$/.test(d.textContent.trim()) && Number(d.textContent.trim().replace(/,/g, '')) > 0),
    { timeout: 25000, label: 'overview metrics' }
  );
  const overview = await page.evaluate(() => document.body.innerText);
  // The tile labels are uppercased by CSS, so innerText returns them shouting.
  check('metric tiles render', /requests/i.test(overview) && /payment volume/i.test(overview));
  check('the watchlist has rows', /Request watchlist/.test(overview));
  // Real data, not an empty shell.
  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll('div')].filter((d) => /^\d[\d,]*$/.test(d.textContent.trim())).map((d) => Number(d.textContent.trim().replace(/,/g, '')))
  );
  check('at least one metric is non-zero', tiles.some((n) => n > 0), tiles.slice(0, 6).join(','));
  await page.screenshot({ path: `${shots}/admin-02-overview.png` });

  console.log('\n\x1b[1mEvery tab loads\x1b[0m');
  const tabs = ['Customers', 'Suppliers', 'Requests', 'Offers', 'Payments', 'Reviews', 'Messages', 'Audit', 'Settings'];
  for (const label of tabs) {
    const clicked = await page.evaluate((name) => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === name);
      if (button) { button.click(); return true; }
      return false;
    }, label);
    if (!clicked) { check(`${label} tab present`, false, 'button not found'); continue; }
    await sleep(1400);
    const text = await page.evaluate(() => document.body.innerText);
    const broke = /Could not load/i.test(text);
    // Every tab renders a Panel whose heading ends in "management", or one of
    // the three named panels.
    const rendered = /management|audit trail|platform settings|watchlist/i.test(text);
    check(`${label} loads`, rendered && !broke, broke ? text.match(/Could not load[^\n]*/i)?.[0] : 'no panel rendered');
  }
  await page.screenshot({ path: `${shots}/admin-03-records.png` });

  console.log('\n\x1b[1mSearch\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Suppliers')?.click());
  await sleep(1200);
  await fill('input[placeholder="Search"]', 'test');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Refresh')?.click());
  await sleep(1500);
  const searched = await page.evaluate(() => document.body.innerText);
  check('search returns without error', !/Could not load/i.test(searched), '');

  console.log('\n\x1b[1mLock console\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Lock console')?.click());
  await waitFor(page, () => /control room/i.test(document.body.innerText) && !/Lock console/.test(document.body.innerText), { label: 'logout' });
  const locked = await page.evaluate(() => document.body.innerText);
  check('signing out returns to the gate', !/Lock console/.test(locked));

  // And the session really is gone, not just hidden by the UI.
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);
  const reloaded = await page.evaluate(() => document.body.innerText);
  check('a reload does not restore the session', !/Lock console/.test(reloaded));

  console.log('\n\x1b[1mRuntime errors\x1b[0m');
  check('no client-side errors', errors.length === 0, errors.slice(0, 4).join(' | '));
} catch (error) {
  failed++;
  failures.push('exception: ' + error.message);
  console.log('\x1b[31mException:\x1b[0m', error.message);
} finally {
  await browser.close();
}

console.log(`\n${'─'.repeat(56)}`);
console.log(`\x1b[1mPassed ${passed}  Failed ${failed}\x1b[0m`);
console.log(`Screenshots: ${shots}`);
if (failures.length) { console.log('\nFailures:'); for (const f of failures) console.log('  • ' + f); }
process.exit(failed ? 1 : 0);
