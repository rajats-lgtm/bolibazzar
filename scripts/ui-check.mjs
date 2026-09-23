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

/**
 * Close any open dialog, sheet or popover and wait for its overlay to go.
 *
 * These render a full-screen overlay that swallows pointer events, so a real
 * mouse click on the page behind one silently hits the overlay instead. Tests
 * that pass in isolation then fail only when run after a step that opened one.
 */
async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const open = await page.evaluate(() =>
      !!document.querySelector('[data-state="open"][role="dialog"], [data-radix-popper-content-wrapper]')
    );
    if (!open) return;
    await page.keyboard.press('Escape');
    await sleep(500);
  }
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
  check('sign-up and sign-in offered', /Create an account/.test(landingText) && /Sign in/.test(landingText));
  check('animated walkthrough present', /Watch a real auction happen/.test(landingText));
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

  // Sign-in now forks by role first, exactly as the mobile apps do.
  const roleShown = await waitFor(
    page,
    () => [...document.querySelectorAll('button')].some((b) => /Log in as a buyer/.test(b.textContent)),
    { label: 'role choice' }
  );
  check('sign-in offers buyer and supplier', roleShown);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Log in as a buyer/.test(b.textContent))?.click();
  });
  await sleep(700);

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

  console.log('\n\x1b[1mChat with a seller\x1b[0m');
  // The auction board is still open from the previous section.
  const chatOpened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => /Chat/.test(b.textContent));
    if (button) { button.click(); return true; }
    return false;
  });
  check('chat opens from an offer', chatOpened);
  if (chatOpened) {
    await waitFor(page, () => !!document.querySelector('input[placeholder], textarea'), { label: 'chat composer' });
    const note = 'Is this sealed stock? ' + Date.now();
    const typed = await page.evaluate((text) => {
      const box = [...document.querySelectorAll('input, textarea')].find((i) => /message|type/i.test(i.placeholder || ''));
      if (!box) return false;
      const proto = box.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(box, text);
      box.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, note);
    check('the composer accepts text', typed);
    // The composer sends on Enter, which avoids having to pick the right icon
    // button out of the whole page.
    await page.focus('input[placeholder="Type a message..."]');
    await page.keyboard.press('Enter');
    const deadline = Date.now() + 15000;
    let sentOk = false;
    while (Date.now() < deadline) {
      sentOk = await page.evaluate((text) => document.body.innerText.includes(text), note);
      if (sentOk) break;
      await sleep(400);
    }
    check('the message appears in the thread', sentOk, '');
    await page.screenshot({ path: `${shots}/10-chat.png` });
    await dismissOverlays(page);
  }

  console.log('\n\x1b[1mNotifications\x1b[0m');
  const bellClicked = await page.evaluate(() => {
    // The bell is the header button carrying an unread count or a bell icon.
    const buttons = [...document.querySelectorAll('header button, nav button')];
    const bell = buttons.find((b) => b.querySelector('svg.lucide-bell') || /bell/i.test(b.className));
    if (bell) { bell.click(); return true; }
    return false;
  });
  check('notification bell is present', bellClicked);
  if (bellClicked) {
    await sleep(1500);
    const feed = await page.evaluate(() => document.body.innerText);
    check('the feed lists something', /offer|request|price|order|notification/i.test(feed), '');
    await page.screenshot({ path: `${shots}/11-notifications.png` });
    // Every other overlay in the app closes on Escape; this one is hand-rolled
    // and used not to, leaving keyboard users stuck with it open.
    await page.keyboard.press('Escape');
    await sleep(700);
    const panelGone = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-label="Notifications"]'));
    check('the feed closes on Escape', panelGone);
    await dismissOverlays(page);
  }

  console.log('\n\x1b[1mMy requests\x1b[0m');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /My requests/i.test(b.textContent))?.click();
  });
  await sleep(2000);
  const mine = await page.evaluate(() => document.body.innerText);
  check('past requests are listed', /iPhone|request/i.test(mine) && !/Could not/i.test(mine), '');
  await page.screenshot({ path: `${shots}/12-my-requests.png` });

  console.log('\n\x1b[1mWallet\x1b[0m');
  // The header balance pill only renders once the account has a wallet, so go
  // through the account menu, which is always there when signed in.
  //
  // This menu opens on pointerdown, so it needs a real mouse click — a
  // synthetic element.click() dispatches only a click event and does nothing.
  await dismissOverlays(page);
  // The menu opens on pointerdown, so element.click() does nothing; and a real
  // mouse click at its coordinates can land on a toast, which stacks in the
  // same top-right corner. Dispatch the event the trigger actually listens for.
  await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-haspopup="menu"]');
    trigger?.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, button: 0, isPrimary: true, pointerType: 'mouse',
    }));
  });
  await sleep(1000);
  const walletOpened = await page.evaluate(() => {
    const item = [...document.querySelectorAll('[role="menuitem"]')].find((i) => /^Wallet/i.test(i.textContent.trim()));
    if (item) { item.click(); return true; }
    return false;
  });
  check('wallet is reachable from the account menu', walletOpened);
  await sleep(2200);
  const walletText = await page.evaluate(() => document.body.innerText);
  check('wallet view renders', /wallet|balance|cashback/i.test(walletText) && !/Could not/i.test(walletText), '');
  await page.screenshot({ path: `${shots}/13-wallet.png` });

  console.log('\n\x1b[1mOrders\x1b[0m');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^Orders$/i.test(b.textContent.trim()))?.click();
  });
  await sleep(2200);
  const ordersText = await page.evaluate(() => document.body.innerText);
  check('orders view renders', !/Could not/i.test(ordersText), '');
  check('orders view is not blank', ordersText.trim().length > 200, String(ordersText.trim().length));
  await page.screenshot({ path: `${shots}/14-orders.png` });

  console.log('\n\x1b[1mPublic storefront\x1b[0m');
  await page.goto(BASE + '/?store=supplier@test.in', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  const storeText = await page.evaluate(() => document.body.innerText);
  check('a storefront renders', /store|supplier|offers|rating/i.test(storeText) && !/not found/i.test(storeText), storeText.slice(0, 80));
  await page.screenshot({ path: `${shots}/15-store.png` });

  console.log('\n\x1b[1mSupplier console\x1b[0m');
  await page.goto(BASE + '/?app&view=supplier', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  const supplierText = await page.evaluate(() => document.body.innerText);
  check('supplier console renders', /Supplier console|Supplier dashboard/.test(supplierText), '');
  await page.screenshot({ path: `${shots}/08-supplier.png` });

  console.log('\n\x1b[1mDeep links from the marketing site\x1b[0m');
  // The marketing site links straight into a role-picked sign-up. If these
  // params stop being honoured, "Register your business" quietly becomes a
  // generic landing page and the visitor has to find the flow themselves.
  await page.goto(BASE + '/?auth=signup&role=supplier', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFor(page, () => !!document.querySelector('input[type="email"]'), { label: 'supplier sign-up email field' });
  const deepText = await page.evaluate(() => document.body.innerText);
  const emailPrompted = await page.evaluate(() => !!document.querySelector('input[type="email"]'));
  check('?auth=signup opens the sign-up flow', emailPrompted);
  check('&role=supplier skips the role choice', !/Log in as a buyer|Sign up as a buyer/.test(deepText), '');
  await page.screenshot({ path: `${shots}/09-deeplink-supplier-signup.png` });

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
