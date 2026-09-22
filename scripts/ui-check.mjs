#!/usr/bin/env node
/**
 * Drives the real web app in Chrome and asserts the buyer journey works in the
 * browser, not just over HTTP. Catches client-side runtime errors that a curl
 * smoke test cannot see.
 *
 *   node scripts/ui-check.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const shots = resolve(dirname(fileURLToPath(import.meta.url)), '../.devdata/screenshots');
mkdirSync(shots, { recursive: true });

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll an in-page predicate until it is true, so we never race hydration. */
async function waitFor(page, fn, { timeout = 25000, label = 'condition' } = {}) {
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
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

// Collect anything that would show up as a red error in devtools.
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
});
// A blocked or unreachable host never produces a response, only a failure.
page.on('requestfailed', (r) => {
  errors.push(`${r.failure()?.errorText || 'failed'}: ${r.url()}`);
});
page.on('console', (m) => {
  if (m.type() === 'error') {
    const text = m.text();
    // Next's dev overlay and favicon noise are not app errors.
    if (!/favicon|Download the React DevTools/i.test(text)) errors.push('console: ' + text);
  }
});

try {
  console.log('\n\x1b[1mLanding page\x1b[0m');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200); // let the splash finish
  const landingText = await page.evaluate(() => document.body.innerText);
  check('hero renders', /Sellers Compete/.test(landingText));
  check('store buttons render', /App Store/.test(landingText) && /Google Play/.test(landingText));
  await page.screenshot({ path: `${shots}/01-landing.png` });

  console.log('\n\x1b[1mBuyer app\x1b[0m');
  await page.goto(BASE + '/?app', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const appText = await page.evaluate(() => document.body.innerText);
  check('ask-AI box renders', /What would you like to buy/.test(appText) || /Ask AI/.test(appText));
  await page.screenshot({ path: `${shots}/02-app-home.png` });

  console.log('\n\x1b[1mOTP sign-in\x1b[0m');
  // The nav shows a skeleton until the session check returns, so wait for the
  // real button rather than assuming it has rendered.
  await waitFor(page, () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Sign in'), { label: 'sign-in button' });
  const signedIn = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sign in');
    if (button) { button.click(); return true; }
    return false;
  });
  check('sign-in button present', signedIn);
  await sleep(900);

  await waitFor(page, () => !!document.querySelector('input[type="email"]'), { label: 'email field' });
  await page.evaluate(() => {
    const input = document.querySelector('input[type="email"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'uicheck@test.in');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Send code/.test(b.textContent))?.click();
  });
  await waitFor(page, () => [...document.querySelectorAll('div')].some((d) => /^\d{6}$/.test(d.textContent.trim())), { label: 'dev code' });

  const devCode = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => /^\d{6}$/.test(d.textContent.trim()));
    return el ? el.textContent.trim() : null;
  });
  check('dev code shown in the dialog', !!devCode, String(devCode));
  await page.screenshot({ path: `${shots}/03-otp.png` });

  if (devCode) {
    await page.evaluate((code) => {
      const input = document.querySelector('input[inputmode="numeric"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, code);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, devCode);
    await sleep(400);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => /Verify/.test(b.textContent))?.click();
    });
    await sleep(3000);
    const who = await page.evaluate(async () => {
      const r = await fetch('/api/auth/session', { credentials: 'same-origin' });
      const d = await r.json().catch(() => ({}));
      return d?.buyer?.email || null;
    });
    check('signed in (session established)', who === 'uicheck@test.in', String(who));
    await page.screenshot({ path: `${shots}/04-signed-in.png` });
  }

  console.log('\n\x1b[1mPost a requirement → live auction\x1b[0m');
  await page.evaluate(() => {
    const box = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(box, 'iPhone 17 Pro Max 256GB Black under 1.2 lakh in Mumbai');
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Ask AI/.test(b.textContent))?.click();
  });
  await waitFor(page, () => /AI understood your requirement/.test(document.body.innerText), { timeout: 40000, label: 'AI extraction' });
  const preview = await page.evaluate(() => document.body.innerText);
  check('AI parsed the requirement', /AI understood your requirement/.test(preview), '');
  await page.screenshot({ path: `${shots}/05-requirement.png` });

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Send to suppliers/.test(b.textContent))?.click();
  });
  await waitFor(page, () => /Live bidding open|ffers received/.test(document.body.innerText), { timeout: 40000, label: 'auction board' });
  const auctionText = await page.evaluate(() => document.body.innerText);
  check('auction board opened', /Live bidding open|offers received|Offers received/i.test(auctionText), '');
  const firstCount = (auctionText.match(/Accept & Pay/g) || []).length;
  await page.screenshot({ path: `${shots}/06-auction.png` });

  await sleep(9000);
  const laterText = await page.evaluate(() => document.body.innerText);
  const laterCount = (laterText.match(/Accept & Pay/g) || []).length;
  check('more bids arrived while watching', laterCount >= firstCount && laterCount > 0, `${firstCount} -> ${laterCount}`);
  check('countdown is running', /\d+s/.test(laterText));
  await page.screenshot({ path: `${shots}/07-auction-later.png` });

  console.log('\n\x1b[1mSupplier console\x1b[0m');
  await page.goto(BASE + '/?app&view=supplier', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  const supplierText = await page.evaluate(() => document.body.innerText);
  check('supplier console renders', /Supplier console|Supplier dashboard/.test(supplierText), '');
  await page.screenshot({ path: `${shots}/08-supplier.png` });

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
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  • ' + f);
}
process.exit(failed ? 1 : 0);
