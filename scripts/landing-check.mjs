#!/usr/bin/env node
/**
 * Drives the public marketing site in Chrome.
 *
 * It deploys separately from the app, so it needs its own check: a broken
 * animation or a sign-up link pointing at the wrong flow would never show up
 * in scripts/ui-check.mjs.
 *
 *   node scripts/landing-check.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3002';
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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
page.on('requestfailed', (r) => errors.push(`${r.failure()?.errorText || 'failed'}: ${r.url()}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon|React DevTools/i.test(m.text())) errors.push('console: ' + m.text());
});

try {
  console.log('\n\x1b[1mMarketing site\x1b[0m');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);
  const text = await page.evaluate(() => document.body.innerText);
  check('hero renders', /Sellers Compete/.test(text));
  check('store buttons render', /App Store/.test(text) && /Google Play/.test(text));
  check('sign-up and sign-in offered', /Create an account/.test(text) && /Sign in/.test(text));
  check('animated walkthrough present', /Watch a real auction happen/.test(text));
  check('step list still explains the flow', /How BoliBazzar works|Tell AI what you want/.test(text));

  console.log('\n\x1b[1mAuth links point at the right flow\x1b[0m');
  const links = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || ''));
  check('sign-in link opens the sign-in fork', links.some((h) => /\?auth=signin$/.test(h)), '');
  check('sign-up link opens the sign-up fork', links.some((h) => /\?auth=signup$/.test(h)), '');
  check('supplier CTA pre-picks supplier', links.some((h) => /auth=signup&role=supplier/.test(h)), '');

  console.log('\n\x1b[1mThe walkthrough actually animates\x1b[0m');
  // Scroll it into view — it deliberately pauses while off-screen.
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((n) => /Watch a real auction/.test(n.textContent));
    h?.scrollIntoView({ block: 'center' });
  });
  await sleep(1200);
  const seen = new Set();
  // Sample the phone screen over one full loop; a frozen animation yields one frame.
  for (let i = 0; i < 26; i++) {
    const frame = await page.evaluate(() => {
      const el = document.querySelector('[data-walkthrough="screen"]');
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    });
    if (frame) seen.add(frame);
    await sleep(600);
  }
  check('the walkthrough advances through stages', seen.size >= 4, `${seen.size} distinct frames`);
  const frames = [...seen].join(' || ');
  check('it reaches the bidding stage', /Croma|offers/.test(frames), '');
  check('it reaches the accepted stage', /Accepted|paid by UPI/i.test(frames), '');
  await page.screenshot({ path: `${shots}/landing-site-animation.png` });

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: `${shots}/landing-site.png` });

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
