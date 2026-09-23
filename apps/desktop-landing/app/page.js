'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Star, Shield, Search, Bell, TrendingDown, Package, ShoppingBag,
  Sun, Moon, Truck, Wallet, MessageSquare, Languages,
} from 'lucide-react';
import HowItWorksAnimation from '../components/HowItWorksAnimation';

/**
 * Public marketing site for BoliBazzar.
 *
 * Deliberately self-contained: no imports from the main app, so this can deploy
 * to the apex domain independently of the product.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * The app forks by role before asking for a code, on web and on mobile alike.
 * These links open that same fork, optionally pre-picking a side, so a visitor
 * who clicks "Register your business" never has to choose supplier twice.
 */
const authUrl = (mode, role) => `${APP_URL}/?auth=${mode}${role ? `&role=${role}` : ''}`;
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || '';
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || '';

function Logo({ size = 32 }) {
  return (
    <svg className="bb-logo-svg" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="55%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path d="M10 6 h26 a18 18 0 0 1 0 26 h-4 a18 18 0 0 1 0 26 h-22 z" fill="url(#bbGrad)" />
      <path d="M22 14 h12 a10 10 0 0 1 0 18 h-12 z M22 34 h16 a10 10 0 0 1 0 18 h-16 z" style={{ fill: 'var(--bb-cut)' }} />
      <g className="bb-cart" transform="translate(21 36)" fill="white">
        <path d="M0 2 h4 l1.5 12 h13 l1.8 -8 h-13.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="17" r="1.6" />
        <circle cx="17" cy="17" r="1.6" />
      </g>
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="font-bold text-lg tracking-tight">
      Boli<span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span>
    </span>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    let stored = null;
    try { stored = localStorage.getItem('bb_theme'); } catch {}
    const prefersDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(prefersDark);
  }, []);
  function apply(isDark) {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    setDark(isDark);
    try { localStorage.setItem('bb_theme', isDark ? 'dark' : 'light'); } catch {}
  }
  return (
    <button
      onClick={() => apply(!dark)}
      className="h-9 w-9 grid place-items-center rounded-md border bb-border hover:bb-surface transition"
      aria-label="Toggle colour theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function StoreButton({ href, kicker, label, children }) {
  const disabled = !href;
  return (
    <a
      href={href || undefined}
      target={href ? '_blank' : undefined}
      rel="noreferrer"
      aria-disabled={disabled}
      title={disabled ? 'Coming soon' : label}
      className={`inline-flex items-center gap-3 rounded-2xl px-5 py-3 transition ${
        disabled
          ? 'border bb-border bb-muted cursor-default'
          : 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90'
      }`}
    >
      {children}
      <span className="text-left">
        <span className="block text-[10px] opacity-70">{disabled ? 'Coming soon on' : kicker}</span>
        <span className="block font-semibold text-lg leading-tight">{label}</span>
      </span>
    </a>
  );
}

const STEPS = [
  { icon: Sparkles, title: 'Tell AI what you want', body: 'Type or speak your requirement in English, Hindi, Tamil, Marathi or Bengali.' },
  { icon: Search, title: 'AI structures your request', body: 'Product, brand, model, budget and location are extracted automatically.' },
  { icon: Bell, title: 'Verified suppliers are notified', body: 'Only matching, GST-registered sellers. No spam, no cold calls.' },
  { icon: TrendingDown, title: 'Suppliers compete live', body: 'Prices drop in real time as sellers undercut each other to win you.' },
  { icon: Package, title: 'Compare in one place', body: 'Price, delivery, warranty and rating side by side, ranked by an AI value score.' },
  { icon: ShoppingBag, title: 'Chat, pay, track', body: 'Negotiate in chat, pay by UPI, and follow your order to the door.' },
];

const FEATURES = [
  { icon: Languages, title: 'Speaks your language', body: 'Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati — and Hinglish.' },
  { icon: Shield, title: 'GST-verified sellers', body: 'Every supplier is reviewed and approved before they can bid on your request.' },
  { icon: Wallet, title: 'Cashback that compounds', body: 'Earn 2–5% back on every order as you move from Silver to Platinum.' },
  { icon: MessageSquare, title: 'Talk to the seller', body: 'Ask about stock, warranty or a better price before you commit.' },
  { icon: Truck, title: 'Tracked to the door', body: 'Live delivery tracking from the store to your doorstep.' },
  { icon: TrendingDown, title: 'You never overpay', body: 'Sellers bid against each other, so the price only moves one way.' },
];

const PHONE_OFFERS = [
  { name: 'Croma - Andheri', price: '₹1.11L', note: 'Same-day', pick: true },
  { name: 'Reliance Digital', price: '₹1.12L', note: 'Next-day', pick: false },
  { name: 'Vijay Sales', price: '₹1.13L', note: '2 days', pick: false },
];

export default function Landing() {
  return (
    <div>
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b bb-border" style={{ background: 'color-mix(in srgb, var(--background) 70%, transparent)' }}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 bb-logo">
            <Logo size={34} />
            <Wordmark />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href={authUrl('signin')} className="rounded-md px-3 py-2 text-sm font-medium bb-muted hover:opacity-80 transition">
              Sign in
            </a>
            <a href={authUrl('signup')} className="rounded-md bg-gradient-to-br from-indigo-600 to-orange-500 text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition">
              Create an account
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-orange-500/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-16 md:pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bb-border px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />India&apos;s first AI reverse marketplace
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]"
            >
              You Ask.<br />
              <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Sellers Compete.</span><br />
              You Win.
            </motion.h1>
            <p className="mt-6 text-lg bb-muted max-w-xl">
              Stop scrolling through listings. Say what you want to buy — verified suppliers across India
              bid against each other in a live auction, and you pick the winner.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <StoreButton href={APP_STORE_URL} kicker="Download on the" label="App Store">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
              </StoreButton>
              <StoreButton href={PLAY_STORE_URL} kicker="Get it on" label="Google Play">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5V3.5a1.5 1.5 0 011.5-1.5c.28 0 .55.08.78.22l13 7.5a1.5 1.5 0 010 2.6l-13 7.5A1.5 1.5 0 013 20.5z" /></svg>
              </StoreButton>
            </div>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <a href={authUrl('signup')} className="rounded-xl bg-gradient-to-br from-indigo-600 to-orange-500 text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition">
                Create an account
              </a>
              <a href={authUrl('signin')} className="rounded-xl border bb-border px-5 py-2.5 text-sm font-medium hover:opacity-80 transition">
                Sign in
              </a>
              <a href={`${APP_URL}/?app`} className="text-sm bb-muted hover:opacity-80 underline underline-offset-4">
                Or look around first →
              </a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm bb-muted flex-wrap">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />4.8 · 12k+ ratings</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-400" />UPI · GST-verified suppliers</span>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative mx-auto md:ml-auto">
            <div className="relative w-[280px] md:w-[320px] h-[560px] md:h-[620px] rounded-[3rem] bg-gradient-to-br from-slate-800 to-slate-950 border-[6px] border-slate-800 shadow-2xl shadow-fuchsia-500/20 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-950 rounded-b-2xl z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-950 p-4 pt-10 text-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Logo size={24} />
                  <span className="font-bold text-sm">Boli<span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span></span>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 mb-3">
                  <div className="text-xs text-slate-400 mb-1">✨ Ask AI what you want</div>
                  <div className="text-sm">iPhone 17 Pro Max 256GB Black under ₹1,20,000</div>
                </div>
                <div className="text-[10px] text-emerald-400 mb-2 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />5 offers received
                </div>
                {PHONE_OFFERS.map((o) => (
                  <div key={o.name} className={`rounded-xl p-2.5 mb-2 border ${o.pick ? 'border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 to-orange-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                    {o.pick && <div className="text-[9px] text-fuchsia-300 mb-0.5">✨ AI PICK</div>}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[11px] font-medium">{o.name}</div>
                        <div className="text-[9px] text-slate-400">{o.note}</div>
                      </div>
                      <div className="font-bold text-sm">{o.price}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 rounded-xl bg-gradient-to-r from-indigo-600 to-orange-500 text-center py-2.5 text-sm font-semibold">
                  Accept &amp; Pay
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bb-border">
        <div className="container mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: '12,400+', l: 'Verified suppliers' },
            { v: '₹42Cr', l: 'Requirements matched' },
            { v: '<45s', l: 'First offer arrives' },
            { v: '18%', l: 'Average saving' },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl md:text-3xl font-semibold">{s.v}</div>
              <div className="text-xs md:text-sm bb-muted mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — the real flow, replayed */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <span className="text-xs bb-muted uppercase tracking-[0.2em]">See it work</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold">Watch a real auction happen</h2>
          <p className="bb-muted mt-3 max-w-2xl mx-auto">
            Post what you want. Verified sellers bid against each other in a live window,
            and the price only moves one way.
          </p>
        </div>
        <div className="mt-12 max-w-5xl mx-auto">
          <HowItWorksAnimation />
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border bb-border bb-surface p-6">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-orange-500/20 border bb-border grid place-items-center">
                  <step.icon className="w-4 h-4 text-fuchsia-400" />
                </span>
                <span className="text-xs bb-muted uppercase tracking-wider">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-lg">{step.title}</h3>
              <p className="bb-muted text-sm mt-1.5">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t bb-border">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-semibold text-center">Built for Bharat</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bb-border p-6">
                <f.icon className="w-5 h-5 text-fuchsia-400" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="bb-muted text-sm mt-1.5">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supplier CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="rounded-3xl border bb-border bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-orange-500/10 p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold">Sell on BoliBazzar</h2>
          <p className="bb-muted mt-3 max-w-xl mx-auto">
            Stop paying for clicks. Get real buyers with real budgets, already telling you exactly what they want to buy.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <a href={authUrl('signup', 'supplier')} className="rounded-xl bg-gradient-to-br from-indigo-600 to-orange-500 text-white px-6 py-3 font-medium hover:opacity-90 transition">
              Register your business
            </a>
            <a href={authUrl('signin', 'supplier')} className="rounded-xl border bb-border px-6 py-3 font-medium hover:opacity-80 transition">
              Supplier sign in
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t bb-border">
        <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bb-logo">
            <Logo size={32} />
            <Wordmark />
            <span className="bb-muted text-sm hidden md:inline">· You Ask. Sellers Compete. You Win.</span>
          </div>
          <div className="text-xs bb-muted">© 2025 BoliBazzar Technologies · Made for Bharat</div>
        </div>
      </footer>
    </div>
  );
}
