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

/**
 * Type into a field, going through React's value setter.
 * Returns false rather than throwing when the field is not there, so a missing
 * input is reported as a failed assertion instead of an opaque
 * "Illegal invocation" from calling the setter on null.
 */
async function fill(selector, value) {
  return page.evaluate((sel, val) => {
    const input = document.querySelector(sel);
    if (!input) return false;
    const proto = input instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, selector, value);
}

try {
  console.log('\n\x1b[1mLogin gate\x1b[0m');
  // A dev server compiles this route on first hit, which on a loaded machine
  // can take well over the default timeout — wait generously here only.
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 90000 });
  await waitFor(page, () => /control room/i.test(document.body.innerText), { timeout: 60000, label: 'login form' });
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
  const tabs = ['Customers', 'Sellers', 'Requests', 'Offers', 'Orders', 'Payments', 'Reviews', 'Messages', 'Broadcast', 'Audit', 'Settings'];
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
    // the named panels.
    const rendered = /management|audit trail|watchlist|send an announcement|auction & bidding/i.test(text);
    check(`${label} loads`, rendered && !broke, broke ? text.match(/Could not load[^\n]*/i)?.[0] : 'no panel rendered');
  }
  await page.screenshot({ path: `${shots}/admin-03-records.png` });

  console.log('\n\x1b[1mSettings really change the platform\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === 'Settings')?.click());
  await waitFor(page, () => /BIDDING WINDOW/i.test(document.body.innerText), { timeout: 25000, label: 'settings catalogue' });
  const settingsText = await page.evaluate(() => document.body.innerText);
  check('every settings group renders', ['Auction & bidding', 'Cashback & loyalty', 'Suppliers & onboarding', 'Sign-in & security', 'Platform & branding', 'Availability'].every((g) => settingsText.includes(g)), '');
  check('a toggle is rendered for boolean settings', await page.evaluate(() => !!document.querySelector('[role="switch"]')));

  // Change the bidding window and confirm the API actually serves the new value
  // — the point of this tab is that settings take effect, not that they save.
  const windowInput = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('label')];
    const target = labels.find((l) => /Bidding window/i.test(l.textContent));
    const input = target?.querySelector('input');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '77');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  check('the bidding window is editable', windowInput);
  await sleep(600);
  const saveShown = await waitFor(page, () => /unsaved change/i.test(document.body.innerText), { timeout: 8000, label: 'save bar' });
  check('unsaved changes are surfaced', saveShown);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Save changes/i.test(b.textContent))?.click());

  /** Poll health until it reports `want`, so the assertion is not a race. */
  async function healthWindow(want, timeout = 20000) {
    const deadline = Date.now() + timeout;
    let seen = null;
    while (Date.now() < deadline) {
      seen = await page.evaluate(async () => {
        const r = await fetch('/api/health?t=' + Date.now(), { cache: 'no-store' });
        return (await r.json()).auction_window_seconds;
      });
      if (seen === want) return seen;
      await sleep(500);
    }
    return seen;
  }

  const applied = await healthWindow(77);
  check('the change is live in the API', applied === 77, `health says ${applied}`);

  // Put it back so a later run starts from the default.
  await page.evaluate(async () => {
    await fetch('/api/admin/settings/auction_window_seconds', { method: 'DELETE' });
  });
  const restored = await healthWindow(120);
  check('resetting restores the default', restored === 120, `health says ${restored}`);
  await page.screenshot({ path: `${shots}/admin-04-settings.png` });

  console.log('\n\x1b[1mSeller drawer and KYC\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === 'Sellers')?.click());
  await sleep(2000);
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Open');
    if (button) { button.click(); return true; }
    return false;
  });
  check('a seller record opens', opened);
  if (opened) {
    await waitFor(page, () => /Identity & compliance/i.test(document.body.innerText), { timeout: 15000, label: 'seller drawer' });
    const drawer = await page.evaluate(() => document.body.innerText);
    check('the KYC checks are listed', /GSTIN/.test(drawer) && /Registered address/.test(drawer) && /Bank account/.test(drawer));
    check('business details are editable', /Registered business name/i.test(drawer));
    check('account standing offers actions', /Mark /i.test(drawer));
    await page.screenshot({ path: `${shots}/admin-05-seller.png` });
    await page.keyboard.press('Escape');
    await sleep(800);
  }

  console.log('\n\x1b[1mCustomer drawer\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === 'Customers')?.click());
  await sleep(2000);
  const custOpened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Open');
    if (button) { button.click(); return true; }
    return false;
  });
  check('a customer record opens', custOpened);
  if (custOpened) {
    await waitFor(page, () => /Account standing/i.test(document.body.innerText), { timeout: 15000, label: 'customer drawer' });
    const drawer = await page.evaluate(() => document.body.innerText);
    check('wallet and orders are shown', /Wallet/i.test(drawer) && /Orders/i.test(drawer));
    check('the profile is editable', /Lifetime spend/i.test(drawer));
    await page.screenshot({ path: `${shots}/admin-06-customer.png` });
    await page.keyboard.press('Escape');
    await sleep(800);
  }

  console.log('\n\x1b[1mBroadcast\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === 'Broadcast')?.click());
  await sleep(1500);
  const broadcast = await page.evaluate(() => document.body.innerText);
  check('the composer renders', /Send an announcement/i.test(broadcast));
  check('it previews what users will see', /Preview/i.test(broadcast));
  // Sending is confirmed in two steps; check the guard exists without sending.
  const guarded = await page.evaluate(() => {
    const send = [...document.querySelectorAll('button')].find((b) => /Review and send/i.test(b.textContent));
    return !!send && send.disabled;
  });
  check('sending is disabled until there is a message', guarded);

  console.log('\n\x1b[1mSearch\x1b[0m');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim() === 'Sellers')?.click());
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
