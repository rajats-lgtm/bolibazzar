'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, TrendingDown } from 'lucide-react';

/**
 * A looping walkthrough of a real auction, for people who have never seen the
 * product. It replays the genuine flow — type a requirement, AI structures it,
 * sellers bid, prices fall, you accept — rather than showing a video, so it
 * stays honest if the product changes and costs nothing to ship.
 *
 * Kept as a copy rather than an import: this site deploys to the apex domain
 * independently of the app, exactly like the rest of apps/desktop-landing.
 *
 * Pauses when scrolled out of view, and respects prefers-reduced-motion by
 * showing the final state instead of animating.
 */

const TYPED = 'iPhone 17 Pro Max 256GB Black under ₹1,20,000';

const CHIPS = [
  { label: 'Apple', delay: 0 },
  { label: '17 Pro Max', delay: 0.1 },
  { label: '256GB', delay: 0.2 },
  { label: 'Black', delay: 0.3 },
  { label: '₹1,20,000', delay: 0.4 },
  { label: 'Mumbai', delay: 0.5 },
];

const BIDS = [
  { name: 'Croma',            city: 'Mumbai',    price: 118900, drop: 114900, note: 'Same-day delivery' },
  { name: 'Reliance Digital', city: 'Mumbai',    price: 117500, drop: 113200, note: 'Next-day delivery' },
  { name: 'iPlanet',          city: 'Bengaluru', price: 116400, drop: 111800, note: '2-day shipping' },
];

const STAGES = ['type', 'parse', 'notify', 'bid', 'win'];
const STAGE_MS = { type: 2600, parse: 2000, notify: 1600, bid: 5200, win: 3000 };

const inr = (n) => '₹' + n.toLocaleString('en-IN');

export default function HowItWorksAnimation() {
  const [stage, setStage] = useState('type');
  const [typed, setTyped] = useState('');
  const [visibleBids, setVisibleBids] = useState(0);
  const [dropped, setDropped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const hostRef = useRef(null);

  // Respect the OS setting: show the end state rather than looping.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Don't animate off-screen.
  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Drive the stage machine.
  useEffect(() => {
    if (reduced || !inView) return;
    const next = STAGES[(STAGES.indexOf(stage) + 1) % STAGES.length];
    const timer = setTimeout(() => {
      if (next === 'type') { setTyped(''); setVisibleBids(0); setDropped(false); }
      setStage(next);
    }, STAGE_MS[stage]);
    return () => clearTimeout(timer);
  }, [stage, reduced, inView]);

  // Typewriter.
  useEffect(() => {
    if (reduced) { setTyped(TYPED); return; }
    if (stage !== 'type' || !inView) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTyped(TYPED.slice(0, i));
      if (i >= TYPED.length) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [stage, reduced, inView]);

  // Bids land one at a time, then two of them undercut.
  useEffect(() => {
    if (reduced) { setVisibleBids(BIDS.length); setDropped(true); return; }
    if (stage !== 'bid' || !inView) return;
    const timers = BIDS.map((_, i) => setTimeout(() => setVisibleBids(i + 1), 500 + i * 800));
    timers.push(setTimeout(() => setDropped(true), 3400));
    return () => timers.forEach(clearTimeout);
  }, [stage, reduced, inView]);

  const stageIndex = STAGES.indexOf(stage);
  const showBoard = reduced || stageIndex >= STAGES.indexOf('bid');
  const won = reduced || stage === 'win';

  const captions = {
    type: 'Say what you want — in English, Hindi, Tamil or Marathi.',
    parse: 'AI pulls out the product, budget and location.',
    notify: 'Only matching, GST-verified sellers are alerted.',
    bid: 'They bid against each other. Prices fall while you watch.',
    win: 'Pick the winner. Pay by UPI. Track it to your door.',
  };

  return (
    <div ref={hostRef} className="grid md:grid-cols-[320px_1fr] gap-8 items-center">
      {/* Phone */}
      <div className="relative mx-auto w-[280px] h-[560px] rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-950 border-[6px] border-slate-800 shadow-2xl shadow-fuchsia-500/20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 bg-slate-950 rounded-b-2xl z-20" />
        <div data-walkthrough="screen" className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-950 p-4 pt-9 text-slate-100">

          {/* The ask */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 min-h-[76px]">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-fuchsia-400" />Ask AI what you want
            </div>
            <div className="text-[13px] leading-snug">
              {typed}
              {!reduced && stage === 'type' && <span className="inline-block w-[2px] h-3.5 bg-fuchsia-400 ml-0.5 align-middle animate-pulse" />}
            </div>
          </div>

          {/* Extracted chips */}
          <AnimatePresence>
            {(reduced || stageIndex >= STAGES.indexOf('parse')) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-1.5 mt-3">
                {CHIPS.map((chip) => (
                  <motion.span
                    key={chip.label}
                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: reduced ? 0 : chip.delay }}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200"
                  >
                    {chip.label}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sellers pinged */}
          <AnimatePresence>
            {!reduced && stage === 'notify' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2">
                {['CR', 'RD', 'iP', 'VS', 'PM'].map((initials, i) => (
                  <motion.div
                    key={initials}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.12, type: 'spring', stiffness: 300 }}
                    className="h-7 w-7 rounded-full bg-white/10 border border-white/15 grid place-items-center text-[9px] font-semibold"
                  >
                    {initials}
                  </motion.div>
                ))}
                <span className="text-[9px] text-emerald-400 ml-1">notified</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live board */}
          <AnimatePresence>
            {showBoard && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {reduced ? BIDS.length : visibleBids} offers
                  </span>
                  <span className="text-[9px] text-amber-300 font-semibold tabular-nums">
                    {won ? 'closed' : '117s'}
                  </span>
                </div>

                {BIDS.slice(0, reduced ? BIDS.length : visibleBids).map((bid, i) => {
                  const isPick = i === BIDS.length - 1;
                  const price = dropped && i < 2 ? bid.drop : bid.price;
                  return (
                    <motion.div
                      key={bid.name}
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      className={`rounded-xl p-2.5 mb-2 border ${
                        isPick && won
                          ? 'border-fuchsia-500/50 bg-gradient-to-br from-fuchsia-500/15 to-orange-500/5'
                          : 'border-white/10 bg-white/[0.02]'
                      }`}
                    >
                      {isPick && won && (
                        <div className="text-[8px] text-fuchsia-300 mb-0.5 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />AI PICK · BEST VALUE
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-[11px] font-medium">{bid.name}</div>
                          <div className="text-[9px] text-slate-400">{bid.note}</div>
                        </div>
                        <div className="text-right">
                          {dropped && i < 2 && (
                            <div className="text-[8px] text-red-400 line-through leading-none">{inr(bid.price)}</div>
                          )}
                          <motion.div key={price} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-[12px] font-bold">
                            {inr(price)}
                          </motion.div>
                          {dropped && i < 2 && (
                            <div className="text-[7px] text-emerald-400 flex items-center gap-0.5 justify-end">
                              <TrendingDown className="w-2 h-2" />dropped
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                <AnimatePresence>
                  {won && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 rounded-xl bg-gradient-to-r from-indigo-600 to-orange-500 text-center py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />Accepted · paid by UPI
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Steps */}
      <div>
        <ol className="space-y-3">
          {STAGES.map((key, i) => {
            const active = !reduced && key === stage;
            const done = !reduced && STAGES.indexOf(key) < stageIndex;
            return (
              <li
                key={key}
                className={`flex gap-3.5 items-start rounded-2xl p-3.5 border transition-colors duration-500 ${
                  active ? 'border-fuchsia-500/40 bg-fuchsia-500/[0.06]' : 'bb-border bb-surface'
                }`}
              >
                <span
                  className={`mt-0.5 h-6 w-6 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold transition-colors duration-500 ${
                    active || done || reduced
                      ? 'bg-gradient-to-br from-indigo-600 to-orange-500 text-white'
                      : 'bg-black/10 bb-muted dark:bg-white/10'
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${active || reduced ? '' : 'bb-muted'}`}>
                  {captions[key]}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="text-xs bb-muted mt-4">
          This is the real flow, not a mock-up — it is what happens when you post a requirement.
        </p>
      </div>
    </div>
  );
}
