'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Search, ShoppingBag, Store, ArrowRight, Check, Star,
  Truck, Shield, Clock, MapPin, Zap, TrendingDown, Users, Package,
  MessageSquare, Loader2, ChevronRight, Award, Percent, Bell, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const EXAMPLES = [
  'I need iPhone 17 Pro Max 256GB Black under ₹1,20,000',
  'Need MacBook Air M5 13-inch 16GB/512GB under ₹95,000, deliver to Bengaluru',
  'Samsung OLED 55-inch TV under ₹80,000 with same-day delivery',
  'PS6 console with one controller, budget 55k, Mumbai',
];

const PRODUCT_IMAGES = {
  smartphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxzbWFydHBob25lfGVufDB8fHx8MTc4NTE0MzYwMXww&ixlib=rb-4.1.0&q=85',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxsYXB0b3B8ZW58MHx8fHwxNzg1MDUzNjUwfDA&ixlib=rb-4.1.0&q=85',
  gaming_console: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwzfHxnYW1pbmclMjBjb25zb2xlfGVufDB8fHx8MTc4NTE0MzYwMXww&ixlib=rb-4.1.0&q=85',
  smartwatch: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHw0fHxzbWFydHdhdGNofGVufDB8fHx8MTc4NTE0MzYwOHww&ixlib=rb-4.1.0&q=85',
};

function formatINR(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return '\u20B9' + Number(n).toLocaleString('en-IN');
}

// ==============================
// LANDING + BUYER HERO
// ==============================
function Hero({ onSubmit, loading }) {
  const [text, setText] = useState('');
  return (
    <section className="relative overflow-hidden">
      {/* gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-blue-500/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-white/20 bg-white/5 backdrop-blur text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-2 text-fuchsia-400" />
            India\'s first AI Reverse Marketplace
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto"
        >
          Tell us what you want to buy.
          <br />
          <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Sellers compete for your business.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          No endless scrolling. Just say what you need — our AI understands, verified suppliers bid live, you pick the best offer.
        </motion.p>

        {/* AI Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 max-w-3xl mx-auto"
        >
          <div className="group relative rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl shadow-fuchsia-500/5 p-2">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-fuchsia-500/40 via-violet-500/30 to-cyan-500/40 opacity-0 group-focus-within:opacity-100 transition -z-10 blur-md" />
            <div className="flex items-start gap-2 p-3">
              <div className="pt-2.5 pl-1 text-fuchsia-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSubmit(text); } }}
                placeholder="What would you like to buy today? e.g. iPhone 17 Pro Max 256GB Black under ₹1,20,000..."
                className="min-h-[64px] resize-none border-0 bg-transparent text-base md:text-lg focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60"
              />
              <Button
                onClick={() => text.trim() && onSubmit(text)}
                disabled={loading || !text.trim()}
                size="lg"
                className="h-12 px-5 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:opacity-90 text-white shadow-lg shadow-fuchsia-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Ask AI</>}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setText(ex)} className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition">
                {ex}
              </button>
            ))}
          </div>
        </motion.div>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { v: '12,400+', l: 'Verified suppliers' },
            { v: '₹42Cr', l: 'Requirements matched' },
            { v: '<45s', l: 'First offer arrives' },
            { v: '18%', l: 'Avg. savings' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="text-2xl md:text-3xl font-semibold">{s.v}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==============================
// STRUCTURED REQUIREMENT PREVIEW
// ==============================
function RequirementPreview({ requirement, onConfirm, onCancel, confirming }) {
  if (!requirement) return null;
  const rows = [
    ['Product', requirement.product],
    ['Brand', requirement.brand],
    ['Model', requirement.model],
    ['Storage', requirement.storage],
    ['RAM', requirement.ram],
    ['Colour', requirement.colour],
    ['Size', requirement.size],
    ['Budget', requirement.budget_inr ? formatINR(requirement.budget_inr) : null],
    ['Location', requirement.location],
    ['Delivery', requirement.delivery_preference],
    ['Quantity', requirement.quantity],
  ].filter(([, v]) => v != null && v !== '');

  return (
    <Dialog open onOpenChange={o => !o && onCancel()}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            AI understood your requirement
          </DialogTitle>
          <DialogDescription>{requirement.summary}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 my-4">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="font-medium mt-0.5">{String(v)}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Edit request</Button>
          <Button onClick={onConfirm} disabled={confirming} className="bg-gradient-to-br from-fuchsia-500 to-violet-600">
            {confirming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending to suppliers...</> : <>Send to suppliers<ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==============================
// LIVE OFFERS FEED
// ==============================
function OfferCard({ offer, rank, onAccept, accepting, bestPrice }) {
  const isBest = offer.price_inr === bestPrice;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-2xl border p-5 ${isBest ? 'border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/[0.06] to-violet-500/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}
    >
      {isBest && (
        <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-fuchsia-500 to-violet-600 border-0">
          <Award className="w-3 h-3 mr-1" /> Best value
        </Badge>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 border border-white/10">
            <AvatarFallback className="bg-transparent font-semibold">{(offer.supplier_name || '?').slice(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{offer.supplier_name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="capitalize">{(offer.supplier_type || '').replace('_', ' ')}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{offer.rating} ({offer.reviews})</span>
              {offer.distance_km != null && (<><span>·</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{offer.distance_km} km</span></>)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatINR(offer.price_inr)}</div>
          <div className="text-xs text-muted-foreground">Valid {offer.validity_hours}h</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-cyan-400" />{offer.delivery_note}</div>
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" />{offer.warranty}</div>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />{offer.delivery_days === 0 ? 'Same-day' : `${offer.delivery_days} day(s)`}</div>
      </div>
      {offer.extras && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300 flex items-center gap-2">
          <Percent className="w-4 h-4" />{offer.extras}
        </div>
      )}
      {offer.message && (
        <div className="mt-3 text-sm text-muted-foreground italic">"{offer.message}"</div>
      )}
      <div className="mt-4 flex gap-2 justify-end">
        <Button variant="ghost" size="sm"><MessageSquare className="w-4 h-4 mr-2" />Chat</Button>
        <Button
          size="sm"
          disabled={accepting || offer.status === 'accepted' || offer.status === 'rejected'}
          onClick={() => onAccept(offer.id)}
          className={isBest ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600' : ''}
        >
          {offer.status === 'accepted' ? <><Check className="w-4 h-4 mr-2" />Accepted</> : offer.status === 'rejected' ? 'Closed' : <>Accept<ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </motion.div>
  );
}

function OffersView({ request, offers, onAccept, accepting, refreshing }) {
  const bestPrice = offers.length ? Math.min(...offers.map(o => o.price_inr)) : null;
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live request · {new Date(request.created_at).toLocaleString('en-IN')}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mt-2">{request.requirement.summary || request.requirement.product}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {request.requirement.brand && <Badge variant="outline">{request.requirement.brand}</Badge>}
            {request.requirement.model && <Badge variant="outline">{request.requirement.model}</Badge>}
            {request.requirement.storage && <Badge variant="outline">{request.requirement.storage}</Badge>}
            {request.requirement.colour && <Badge variant="outline">{request.requirement.colour}</Badge>}
            {request.requirement.budget_inr && <Badge variant="outline">Budget {formatINR(request.requirement.budget_inr)}</Badge>}
            {request.requirement.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{request.requirement.location}</Badge>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Offers received</div>
          <div className="text-3xl font-bold">{offers.length}</div>
        </div>
      </div>

      {refreshing && !offers.length && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="inline-flex items-center gap-3 text-lg">
            <Loader2 className="w-5 h-5 animate-spin text-fuchsia-400" />
            Notifying verified suppliers... first offers arriving
          </div>
          <div className="mt-3 text-sm text-muted-foreground">Our AI is matching your requirement with the top electronics suppliers in India.</div>
        </div>
      )}

      <div className="grid gap-4">
        <AnimatePresence>
          {offers.map((o, i) => (
            <OfferCard key={o.id} offer={o} rank={i+1} onAccept={onAccept} accepting={accepting} bestPrice={bestPrice} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==============================
// HOW IT WORKS + FEATURES
// ==============================
function HowItWorks() {
  const steps = [
    { n: 1, t: 'Tell AI what you want', d: 'Type your requirement in plain English or Hindi. No forms, no filters.', icon: Sparkles },
    { n: 2, t: 'AI structures your request', d: 'Product, brand, model, budget, location — extracted automatically.', icon: Search },
    { n: 3, t: 'Verified suppliers receive it', d: 'Only matching, verified sellers get notified. No spam.', icon: Bell },
    { n: 4, t: 'Suppliers compete with offers', d: 'Prices drop as sellers bid live to win your order.', icon: TrendingDown },
    { n: 5, t: 'Compare in one table', d: 'Price, delivery, warranty, rating — side by side.', icon: Package },
    { n: 6, t: 'Buy from the best', d: 'One click. Chat, negotiate, pay. Track till delivery.', icon: ShoppingBag },
  ];
  return (
    <section id="how" className="container mx-auto px-6 py-24">
      <div className="text-center mb-14">
        <Badge variant="outline" className="mb-4">How it works</Badge>
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Six steps. Zero scrolling.</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Buying an iPhone shouldn\'t feel like a research project.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map(s => (
          <div key={s.n} className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-white/10 grid place-items-center">
                <s.icon className="w-5 h-5 text-fuchsia-300" />
              </div>
              <div className="text-sm text-muted-foreground">Step {s.n}</div>
            </div>
            <div className="mt-4 text-xl font-semibold">{s.t}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedElectronics() {
  const items = [
    { k: 'smartphone', t: 'Smartphones', d: 'iPhone, Samsung, OnePlus, Pixel' },
    { k: 'laptop', t: 'Laptops', d: 'MacBook, Dell, HP, Lenovo, Asus' },
    { k: 'gaming_console', t: 'Gaming', d: 'PS6, Xbox, Nintendo, PC parts' },
    { k: 'smartwatch', t: 'Wearables', d: 'Apple Watch, Garmin, Samsung' },
  ];
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <Badge variant="outline" className="mb-3">Category · Electronics</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold">Everything electronics.</h2>
        </div>
        <div className="text-sm text-muted-foreground hidden md:block">More categories launching soon.</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i.k} className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-fuchsia-500/30 transition">
            <div className="aspect-[4/3] overflow-hidden bg-black/30">
              <img src={PRODUCT_IMAGES[i.k]} alt={i.t} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
            </div>
            <div className="p-4">
              <div className="font-semibold">{i.t}</div>
              <div className="text-sm text-muted-foreground">{i.d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { n: 'Aditya S.', r: 'Bengaluru', q: 'Got my MacBook Air M5 ₹8,200 cheaper than any online store. Four offers in under a minute.' },
    { n: 'Priya M.', r: 'Mumbai', q: 'I just typed what I wanted. No filters, no research. This is the future.' },
    { n: 'Rohan K.', r: 'Delhi', q: 'Local Croma matched online price + free delivery + free case. Insane.' },
  ];
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-3">Loved by early buyers</Badge>
        <h2 className="text-4xl font-semibold">Buyers save. Suppliers grow.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {t.map(x => (
          <div key={x.n} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-1 text-yellow-400 mb-3">{[...Array(5)].map((_,i)=><Star key={i} className="w-4 h-4 fill-current" />)}</div>
            <div className="text-foreground/90">"{x.q}"</div>
            <div className="mt-4 text-sm text-muted-foreground">{x.n} · {x.r}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const q = [
    { q: 'How is this different from Amazon or Flipkart?', a: 'On BoliBazaar you don\'t search. You describe what you want, and verified suppliers compete to sell it to you at the best price.' },
    { q: 'Is it really free for buyers?', a: 'Yes. Buyers pay zero platform fees. Suppliers pay a small commission only on completed orders.' },
    { q: 'Are suppliers verified?', a: 'Every supplier goes through GST, business, address and brand authorisation checks before joining.' },
    { q: 'Can I negotiate?', a: 'Yes — every offer has a built-in chat with the supplier to negotiate price, delivery or freebies.' },
    { q: 'Which categories are live?', a: 'Electronics is live now. Furniture, Cars, Bikes, Home Services and more launch through 2025.' },
  ];
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">FAQ</Badge>
          <h2 className="text-4xl font-semibold">Questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {q.map((x, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-white/10">
              <AccordionTrigger className="text-left hover:no-underline">{x.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{x.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-semibold">BoliBazaar</div>
          <span className="text-muted-foreground text-sm">· India\'s AI Reverse Marketplace</span>
        </div>
        <div className="text-xs text-muted-foreground">© 2025 BoliBazaar Technologies · Made for Bharat</div>
      </div>
    </footer>
  );
}

function Navbar({ view, setView }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => setView('home')} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-semibold text-lg tracking-tight">BoliBazaar</div>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant={view === 'home' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('home')}>
            <ShoppingBag className="w-4 h-4 mr-2" />Buy
          </Button>
          <Button variant={view === 'supplier' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('supplier')}>
            <Store className="w-4 h-4 mr-2" />Supplier dashboard
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-white text-black hover:bg-white/90">Sign in</Button>
        </div>
      </div>
    </header>
  );
}

// ==============================
// SUPPLIER DASHBOARD
// ==============================
function SupplierDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ supplier_name: 'Croma - Andheri', price_inr: '', delivery_days: '2', delivery_note: 'Next-day delivery', warranty: '1 year manufacturer', rating: '4.6', reviews: '1200', validity_hours: '24', extras: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/requests');
    const j = await r.json();
    setRequests(j.requests || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submitOffer() {
    if (!selected) return;
    setSubmitting(true);
    const r = await fetch(`/api/requests/${selected.id}/offers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (r.ok) { toast.success('Offer sent to buyer'); setSelected(null); }
    else toast.error('Failed to send offer');
    setSubmitting(false);
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3"><Store className="w-3 h-3 mr-1" />Supplier dashboard</Badge>
        <h1 className="text-4xl font-semibold">Incoming buyer requests</h1>
        <p className="text-muted-foreground mt-2">Live requirements from verified buyers. Submit your best offer to win.</p>
      </div>

      {loading && <div className="text-muted-foreground">Loading requests...</div>}

      <div className="grid gap-3">
        {requests.map(req => (
          <div key={req.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${req.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  {req.status.toUpperCase()} · {new Date(req.created_at).toLocaleString('en-IN')}
                </div>
                <div className="text-lg font-semibold mt-1">{req.requirement.summary || req.requirement.product}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {req.requirement.brand && <Badge variant="outline">{req.requirement.brand}</Badge>}
                  {req.requirement.model && <Badge variant="outline">{req.requirement.model}</Badge>}
                  {req.requirement.storage && <Badge variant="outline">{req.requirement.storage}</Badge>}
                  {req.requirement.colour && <Badge variant="outline">{req.requirement.colour}</Badge>}
                  {req.requirement.budget_inr && <Badge variant="outline">Budget {formatINR(req.requirement.budget_inr)}</Badge>}
                  {req.requirement.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{req.requirement.location}</Badge>}
                  <Badge variant="outline">Qty {req.requirement.quantity}</Badge>
                </div>
              </div>
              <Button onClick={() => { setSelected(req); setForm(f => ({ ...f, price_inr: req.requirement.budget_inr ? String(Math.round(req.requirement.budget_inr * 0.95)) : '' })); }} disabled={req.status !== 'open'}>
                Submit offer<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && !requests.length && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-muted-foreground">
            No requests yet. Ask a buyer to submit one on the home page.
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle>Submit your offer</DialogTitle>
            <DialogDescription>{selected?.requirement?.summary}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Store / Supplier name</label>
              <Input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Price (₹)</label>
              <Input type="number" value={form.price_inr} onChange={e => setForm({...form, price_inr: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Delivery days</label>
              <Input type="number" value={form.delivery_days} onChange={e => setForm({...form, delivery_days: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Delivery note</label>
              <Input value={form.delivery_note} onChange={e => setForm({...form, delivery_note: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Warranty</label>
              <Input value={form.warranty} onChange={e => setForm({...form, warranty: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Extras (free items, discounts)</label>
              <Input value={form.extras} onChange={e => setForm({...form, extras: e.target.value})} placeholder="Free case + HDFC 10% off" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Message to buyer</label>
              <Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={2} placeholder="Available in stock, ready to dispatch today" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={submitOffer} disabled={submitting || !form.price_inr}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Send offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==============================
// MAIN APP
// ==============================
function App() {
  const [view, setView] = useState('home'); // home | offers | supplier
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [requirement, setRequirement] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function handleExtract(t) {
    setText(t);
    setLoading(true);
    try {
      const r = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      setRequirement(j.requirement);
    } catch (e) {
      toast.error(e.message || 'AI extraction failed');
    }
    setLoading(false);
  }

  async function confirmRequirement() {
    setConfirming(true);
    try {
      const r = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requirement, raw_text: text }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRequest(j.request);
      setRequirement(null);
      setView('offers');
      setOffers([]);
      setRefreshing(true);
      // Kick off AI-simulated supplier bidding
      const sim = await fetch(`/api/requests/${j.request.id}/simulate`, { method: 'POST' });
      const simJ = await sim.json();
      if (sim.ok && simJ.offers) {
        // Stagger offers for live-feel
        const sorted = [...simJ.offers].sort((a, b) => a.price_inr - b.price_inr);
        for (let i = 0; i < sorted.length; i++) {
          await new Promise(res => setTimeout(res, 600 + Math.random() * 700));
          setOffers(prev => [...prev, sorted[i]].sort((a, b) => a.price_inr - b.price_inr));
        }
      }
      setRefreshing(false);
    } catch (e) {
      toast.error(e.message || 'Failed to send to suppliers');
    }
    setConfirming(false);
  }

  async function acceptOffer(offerId) {
    setAccepting(true);
    const r = await fetch(`/api/offers/${offerId}/accept`, { method: 'POST' });
    if (r.ok) {
      toast.success('Offer accepted! Order confirmed.');
      // Refresh offers to reflect statuses
      const rr = await fetch(`/api/requests/${request.id}`);
      const jj = await rr.json();
      setOffers(jj.offers || []);
      setRequest(jj.request);
    } else {
      toast.error('Failed to accept');
    }
    setAccepting(false);
  }

  return (
    <div>
      <Navbar view={view} setView={(v) => { setView(v); if (v === 'home') { setRequest(null); setOffers([]); } }} />

      {view === 'home' && !request && (
        <>
          <Hero onSubmit={handleExtract} loading={loading} />
          <FeaturedElectronics />
          <HowItWorks />
          <Testimonials />
          <FAQ />
          <Footer />
        </>
      )}

      {view === 'offers' && request && (
        <>
          <OffersView request={request} offers={offers} onAccept={acceptOffer} accepting={accepting} refreshing={refreshing} />
          <Footer />
        </>
      )}

      {view === 'supplier' && (
        <>
          <SupplierDashboard />
          <Footer />
        </>
      )}

      {requirement && (
        <RequirementPreview
          requirement={requirement}
          onConfirm={confirmRequirement}
          onCancel={() => setRequirement(null)}
          confirming={confirming}
        />
      )}
    </div>
  );
}

export default App;
