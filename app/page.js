'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import confetti from 'canvas-confetti';
import {
  Sparkles, Send, ShoppingBag, Store, ArrowRight, Check, Star, Truck, Shield, Clock,
  MapPin, TrendingDown, Package, MessageSquare, Loader2, ChevronRight, Award, Percent,
  Bell, Search, User, LogOut, CreditCard, CheckCircle2, X, FileCheck, Building2, ClipboardList,
  Mic, MicOff, Languages, Timer, BarChart3, Trophy, Zap, TrendingUp, Flame,
  Volume2, Wallet, Share2, Bot, Plus, Trash2, Power, Users, Crown, Sun, Moon, Mail, Download, Copy
} from 'lucide-react';

const LANG_TO_TTS = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', mr: 'mr-IN', bn: 'bn-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', mixed: 'en-IN' };
function speak(text, langCode = 'en-IN') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode;
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) { console.log('TTS failed', e); }
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import HowItWorksAnimation from '@/components/marketing/HowItWorksAnimation';

const EXAMPLES = [
  'I need iPhone 17 Pro Max 256GB Black under ₹1,20,000',
  'Need MacBook Air M5 13-inch 16GB/512GB under ₹95,000, Bengaluru',
  'Samsung OLED 55-inch TV under ₹80,000 same-day delivery',
  'PS6 console with one controller, budget 55k, Mumbai',
];
const PRODUCT_IMAGES = {
  smartphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxzbWFydHBob25lfGVufDB8fHx8MTc4NTE0MzYwMXww&ixlib=rb-4.1.0&q=85',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxsYXB0b3B8ZW58MHx8fHwxNzg1MDUzNjUwfDA&ixlib=rb-4.1.0&q=85',
  gaming_console: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwzfHxnYW1pbmclMjBjb25zb2xlfGVufDB8fHx8MTc4NTE0MzYwMXww&ixlib=rb-4.1.0&q=85',
  smartwatch: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHw0fHxzbWFydHdhdGNofGVufDB8fHx8MTc4NTE0MzYwOHww&ixlib=rb-4.1.0&q=85',
};

const formatINR = (n) => n == null || isNaN(Number(n)) ? '—' : '\u20B9' + Number(n).toLocaleString('en-IN');
/**
 * API helper. Session cookies are httpOnly and same-origin, so they ride along
 * automatically; we only need to survive a non-JSON error page without throwing.
 */
async function api(path, options = {}) {
  try {
    const response = await fetch('/api' + path, {
      credentials: 'same-origin',
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, ...data };
  } catch {
    return { ok: false, status: 0, error: 'Network error — is the server running?' };
  }
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
const del = (path, body) => api(path, { method: 'DELETE', body: JSON.stringify(body || {}) });

// ============ BOLIBAZZAR LOGO ============
function BoliBazzarLogo({ size = 32, showWordmark = false, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 bb-logo ${className}`}>
      <svg className="bb-logo-svg" width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="bbGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="55%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        {/* Rounded B block */}
        <path d="M10 6 h26 a18 18 0 0 1 0 26 h-4 a18 18 0 0 1 0 26 h-22 z" fill="url(#bbGrad)" />
        {/* Inner cutouts to shape B */}
        <path d="M22 14 h12 a10 10 0 0 1 0 18 h-12 z M22 34 h16 a10 10 0 0 1 0 18 h-16 z" fill="#0a0a0f" className="dark:fill-[#0a0a0f]" style={{ fill: 'var(--bb-cut, #0a0a0f)' }} />
        {/* Shopping cart inside (animated on hover) */}
        <g className="bb-cart" transform="translate(21 36)" fill="white">
          <path d="M0 2 h4 l1.5 12 h13 l1.8 -8 h-13.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="17" r="1.6" />
          <circle cx="17" cy="17" r="1.6" />
        </g>
      </svg>
      {showWordmark && (
        <div className="leading-none">
          <div className="font-bold text-lg tracking-tight">
            <span className="text-foreground">Boli</span>
            <span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SPLASH (first-visit only) ============
function Splash({ onDone }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    try { localStorage.setItem('bb_splash_seen', '1'); } catch {}
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(onDone, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className={`fixed inset-0 z-[999] grid place-items-center bg-background ${fading ? 'bb-splash-fade' : 'bb-splash'}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-orange-500/20 blur-3xl" />
      </div>
      <div className="text-center relative">
        <div className="inline-block">
          <BoliBazzarLogo size={110} />
        </div>
        <div className="mt-6 font-bold text-4xl md:text-5xl tracking-tight">
          <span className="text-foreground">Boli</span>
          <span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span>
        </div>
        <div className="mt-3 text-muted-foreground text-lg">You Ask. Sellers Compete. <span className="text-foreground">You Win.</span></div>
        <div className="mt-6 flex justify-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay:'0ms'}} />
          <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 animate-bounce" style={{animationDelay:'150ms'}} />
          <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{animationDelay:'300ms'}} />
        </div>
      </div>
    </div>
  );
}

// ============ THEME TOGGLE ============
function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);
  function toggle() {
    const d = document.documentElement;
    if (d.classList.contains('dark')) { d.classList.remove('dark'); localStorage.setItem('bb_theme', 'light'); setDark(false); }
    else { d.classList.add('dark'); localStorage.setItem('bb_theme', 'dark'); setDark(true); }
  }
  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="w-9 h-9 p-0" title="Toggle theme">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ============ GUEST REQUEST TRACKING ============
// Requests made before signing in are remembered locally, then claimed onto the
// account at login so nothing is lost.
const GUEST_KEY = 'bb_guest_requests';
function rememberGuestRequest(id) {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    if (!list.includes(id)) localStorage.setItem(GUEST_KEY, JSON.stringify([...list, id].slice(-20)));
  } catch {}
}
function takeGuestRequests() {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    localStorage.removeItem(GUEST_KEY);
    return list;
  } catch { return []; }
}

// ============ LOGIN MODAL (one-time passcode) ============
function AuthModal({ open, onOpenChange, onAuthed, mode = 'signin', role: fixedRole = null }) {
  // Mirrors the mobile flow: pick buyer or supplier, then verify by code.
  const [role, setRole] = useState(fixedRole);
  useEffect(() => { if (open) setRole(fixedRole); }, [open, fixedRole]);
  if (open && !role) {
    const verb = mode === 'signup' ? 'Sign up' : 'Log in';
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'signup' ? 'Choose the kind of account you need.' : 'Choose how you want to log in.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { r: 'buyer', icon: ShoppingBag, title: `${verb} as a buyer`, body: 'Tell AI what you want to buy and let verified sellers compete for your business.' },
              { r: 'supplier', icon: Store, title: `${verb} as a supplier`, body: 'Get live buyer requests with real budgets and win them with your best price.' },
            ].map(({ r, icon: Icon, title, body }) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition"
              >
                <span className="h-11 w-11 shrink-0 rounded-xl bg-fuchsia-500/10 grid place-items-center">
                  <Icon className="w-5 h-5 text-fuchsia-400" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-muted-foreground mt-0.5">{body}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground mt-2">
            {mode === 'signup' ? 'Already have an account? ' : 'New to BoliBazzar? '}
            <button className="text-fuchsia-400 font-medium" onClick={() => onOpenChange({ mode: mode === 'signup' ? 'signin' : 'signup' })}>
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return <OtpModal open={open} onOpenChange={onOpenChange} onAuthed={onAuthed} role={role} mode={mode} onBack={() => setRole(null)} />;
}

function OtpModal({ open, onOpenChange, onAuthed, role, mode, onBack }) {
  const [step, setStep] = useState('identify');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) { setStep('identify'); setCode(''); setDevCode(null); setCooldown(0); }
  }, [open]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode() {
    if (!email.trim()) return toast.error('Enter your email address');
    setLoading(true);
    const r = await post('/auth/otp/request', { email, role });
    setLoading(false);
    if (!r.ok) return toast.error(r.error || 'Could not send the code');
    setStep('verify');
    setCooldown(30);
    setDevCode(r.dev_code || null);
    toast.success(r.dev_code ? 'Code generated (dev mode)' : 'Code sent to ' + email);
  }

  async function verify() {
    if (code.trim().length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    const r = await post('/auth/otp/verify', {
      email, code: code.trim(), role, name: name.trim() || undefined,
      business_name: role === 'supplier' ? name.trim() || undefined : undefined,
      claim_request_ids: role === 'buyer' ? takeGuestRequests() : undefined,
    });
    setLoading(false);
    if (!r.ok) return toast.error(r.error || 'Could not verify the code');
    const account = role === 'supplier' ? r.supplier : r.user;
    onAuthed(role, account);
    onOpenChange(false);
    const who = role === 'supplier' ? account?.business_name : account?.name;
    toast.success('Welcome, ' + String(who || '').split(' ')[0]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background/95 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {onBack && (
              <button onClick={step === 'verify' ? () => setStep('identify') : onBack} className="text-muted-foreground hover:text-foreground">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            {role === 'supplier' ? 'Supplier account' : 'Buyer account'}
          </DialogTitle>
          <DialogDescription>
            {step === 'identify'
              ? 'We’ll send a 6-digit code to your email. No password needed.'
              : `Enter the code we sent to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'identify' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Email address</label>
              <Input
                value={email} onChange={e => setEmail(e.target.value)} type="email" autoFocus
                onKeyDown={e => e.key === 'Enter' && requestCode()}
                placeholder={role === 'supplier' ? 'store@brand.com' : 'you@example.com'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                {role === 'supplier' ? 'Business name (new accounts)' : 'Full name (new accounts)'}
              </label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={role === 'supplier' ? 'Croma Retail' : 'Rohan Kumar'} />
            </div>
            <Button className="w-full bg-gradient-to-br from-indigo-600 to-orange-500" onClick={requestCode} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}Send code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {devCode && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 text-sm">
                <div className="text-amber-300 text-xs uppercase tracking-wider">Dev mode</div>
                <div className="font-mono text-xl tracking-[0.3em] mt-1">{devCode}</div>
                <div className="text-xs text-muted-foreground mt-1">Shown because OTP_DEV_MODE is on. Turn it off for real delivery.</div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">6-digit code</label>
              <Input
                value={code} autoFocus inputMode="numeric" maxLength={6}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verify()}
                placeholder="000000" className="text-center text-2xl tracking-[0.4em] font-mono h-14"
              />
            </div>
            <Button className="w-full bg-gradient-to-br from-indigo-600 to-orange-500" onClick={verify} disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}Verify &amp; continue
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setStep('identify')}>Use a different email</button>
              <button className="text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-40" disabled={cooldown > 0} onClick={requestCode}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ NOTIFICATION BELL ============
function NotificationBell({ enabled }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    if (!enabled) { setItems([]); setUnread(0); return; }
    const r = await api('/notifications');
    if (r.ok) { setItems(r.notifications || []); setUnread(r.unread || 0); }
  }
  useEffect(() => {
    load();
    if (!enabled) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [enabled]);

  async function openPanel() {
    setOpen(o => !o);
    if (!open && unread > 0) { await post('/notifications/read', {}); setUnread(0); }
  }
  if (!enabled) return null;

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="w-9 h-9 p-0 relative" onClick={openPanel} title="Notifications">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 text-[10px] font-semibold grid place-items-center text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl z-50">
            <div className="p-3 border-b border-white/10 text-sm font-semibold">Notifications</div>
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nothing yet.</div>
            ) : items.map(n => (
              <div key={n.id} className={`p-3 border-b border-white/5 ${n.read ? '' : 'bg-fuchsia-500/[0.04]'}`}>
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============ SUPPLIER SIGNUP MODAL ============
function SupplierSignupModal({ open, onOpenChange, onDone }) {
  const [f, setF] = useState({ business_name: '', gst: '', email: '', phone: '', contact_name: '', city: 'Mumbai', pincode: '', address: '', supplier_type: 'retail_store', brand_authorisations: '' });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  async function submit() {
    setLoading(true);
    setFieldErrors({});
    const r = await post('/suppliers', {
      ...f,
      brand_authorisations: f.brand_authorisations.split(',').map(s => s.trim()).filter(Boolean),
    });
    if (!r.ok && r.fields) {
      // The server validates the GSTIN structurally; show its reasons inline.
      setFieldErrors(r.fields);
      toast.error('Please correct the highlighted details');
      setLoading(false);
      return;
    }
    if (r.ok) {
      // A valid GSTIN format is a sanity check, not verification — an admin
      // still approves the account before it can bid.
      if (r.supplier.status === 'approved') toast.success('Your business is approved. Live requests are now visible.');
      else if (r.supplier.gst_format_ok) toast.success('Details saved. An admin will review and approve your account shortly.');
      else toast.warning('Saved, but that GSTIN format looks wrong. Please double-check it.');
      onDone(r.supplier);
      onOpenChange(false);
    } else toast.error(r.error || 'Could not save those details');
    setLoading(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background/95 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl"><Building2 className="w-5 h-5 text-fuchsia-400" />Become a verified supplier</DialogTitle>
          <DialogDescription>Get live buyer requests from across India. Submit your GSTIN and an admin approves your account, usually the same day.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Business name *</label>
            <Input value={f.business_name} onChange={e => setF({...f, business_name: e.target.value})} placeholder="Croma Retail Pvt Ltd" />
            {fieldErrors.business_name && <div className="text-xs text-red-400 mt-1">{fieldErrors.business_name}</div>}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">GSTIN * (15 chars)</label>
            <Input value={f.gst} onChange={e => setF({...f, gst: e.target.value.toUpperCase()})} placeholder="27AAECI1681G1ZP" maxLength={15} />
            {fieldErrors.gst && <div className="text-xs text-red-400 mt-1">{fieldErrors.gst}</div>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email *</label>
            <Input value={f.email} onChange={e => setF({...f, email: e.target.value})} type="email" placeholder="store@brand.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Contact person *</label>
            <Input value={f.contact_name} onChange={e => setF({...f, contact_name: e.target.value})} placeholder="Full name" />
            {fieldErrors.contact_name && <div className="text-xs text-red-400 mt-1">{fieldErrors.contact_name}</div>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">City *</label>
            <Input value={f.city} onChange={e => setF({...f, city: e.target.value})} />
            {fieldErrors.city && <div className="text-xs text-red-400 mt-1">{fieldErrors.city}</div>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">PIN code *</label>
            <Input value={f.pincode} onChange={e => setF({...f, pincode: e.target.value})} />
            {fieldErrors.pincode && <div className="text-xs text-red-400 mt-1">{fieldErrors.pincode}</div>}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Registered address *</label>
            <Input value={f.address} onChange={e => setF({...f, address: e.target.value})} placeholder="Shop 12, Phoenix Marketcity" />
            {fieldErrors.address && <div className="text-xs text-red-400 mt-1">{fieldErrors.address}</div>}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Supplier type</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {[['retail_store','Retail store'],['brand_store','Brand store'],['authorised_reseller','Authorised reseller'],['wholesaler','Wholesaler'],['distributor','Distributor']].map(([v,l]) => (
                <button key={v} onClick={() => setF({...f, supplier_type: v})} className={`px-3 py-1.5 rounded-full text-xs border transition ${f.supplier_type === v ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200' : 'border-white/10 hover:border-white/20'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Brand authorisations (comma separated)</label>
            <Input value={f.brand_authorisations} onChange={e => setF({...f, brand_authorisations: e.target.value})} placeholder="Apple, Samsung, Sony, Dell" />
          </div>
        </div>
        <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-br from-indigo-600 to-orange-500 mt-2">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}Submit for verification
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============ CHAT SHEET ============
function ChatSheet({ offer, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sinceRef] = useState({ current: null });
  const endRef = useRef(null);

  async function loadInitial() {
    const r = await api(`/messages/${offer.id}`);
    setMessages(r.messages || []);
    if ((r.messages || []).length) sinceRef.current = r.messages[r.messages.length - 1].created_at;
    // mark read
    await post(`/messages/${offer.id}/read`);
  }
  async function poll() {
    const url = sinceRef.current ? `/messages/${offer.id}?since=${encodeURIComponent(sinceRef.current)}` : `/messages/${offer.id}`;
    const r = await api(url);
    if (r.messages && r.messages.length) {
      setMessages(prev => [...prev, ...r.messages]);
      sinceRef.current = r.messages[r.messages.length - 1].created_at;
    }
  }
  useEffect(() => {
    loadInitial();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [offer.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    // The sender is derived from the session server-side, so nobody can post as
    // someone else.
    const r = await post('/messages', { offer_id: offer.id, text });
    if (r.ok) {
      setMessages(prev => [...prev, r.message]);
      sinceRef.current = r.message.created_at;
      setText('');
    } else {
      toast.error(r.error || 'Could not send that message');
    }
    setSending(false);
  }

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="bg-background/95 border-white/10 flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-white/10">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 border border-white/10">
              <AvatarFallback className="bg-transparent">{offer.supplier_name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div>{offer.supplier_name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 font-normal"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Online · {formatINR(offer.price_inr)}</div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Start the conversation with {offer.supplier_name.split(' -')[0]}. Ask about warranty, delivery, negotiate the price.
            </div>
          )}
          {messages.map(m => {
            const mine = m.sender === 'buyer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-gradient-to-br from-indigo-600 to-orange-500 text-white' : 'bg-white/5 border border-white/10'}`}>
                  <div>{m.text}</div>
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-white/70 justify-end' : 'text-muted-foreground'}`}>
                    {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {mine && (m.read ? <CheckCircle2 className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." />
          <Button onClick={send} disabled={sending || !text.trim()}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============ SUCCESS CELEBRATION (confetti) ============
function SuccessCelebration({ offer, tier, cashback, shareOnWhatsApp, onClose }) {
  useEffect(() => {
    const colors = ['#4338ca', '#e11d48', '#f97316', '#a21caf', '#22d3ee', '#f59e0b'];
    // Big burst
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.55 }, colors });
    // Left + right cannons
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
    }, 250);
    // Trailing sparkles
    setTimeout(() => confetti({ particleCount: 40, startVelocity: 25, spread: 360, ticks: 60, gravity: 0.5, origin: { y: 0.4 }, colors, shapes: ['circle'], scalar: 0.7 }), 800);
  }, []);
  return (
    <div className="py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-orange-500/20 border border-fuchsia-500/40 grid place-items-center mx-auto shadow-2xl shadow-fuchsia-500/20">
        <Check className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="mt-4 text-xl font-semibold">Payment successful 🎉</div>
      <div className="text-sm text-muted-foreground">Order with {offer.supplier_name} confirmed. Delivery in {offer.delivery_days === 0 ? 'a few hours' : `${offer.delivery_days} day(s)`}.</div>
      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
        <Wallet className="w-3 h-3" />+{formatINR(cashback ?? Math.round(offer.price_inr * ((tier?.cashback_pct || 2) / 100)))} {tier?.label || 'Silver'} cashback added to wallet
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" onClick={shareOnWhatsApp}>
          <Share2 className="w-4 h-4 mr-2" />Share deal
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ============ PAYMENT MODAL ============
function PaymentModal({ offer, user, wallet, tier, onClose, onPaid, onReloadWallet }) {
  const [step, setStep] = useState('review');
  const [creating, setCreating] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [error, setError] = useState('');
  const [cashback, setCashback] = useState(null);
  const walletBal = wallet?.balance_inr || 0;
  const walletApply = useWallet ? Math.min(walletBal, Math.max(0, offer.price_inr - 1)) : 0;
  const finalAmount = offer.price_inr - walletApply;

  async function settle(payload) {
    const v = await post('/payments/verify', payload);
    if (v.ok) {
      setStep('success');
      setCashback(v.cashback_inr ?? null);
      onPaid();
      onReloadWallet?.();
    } else {
      setError(v.error || 'We could not confirm that payment.');
      setStep('fail');
    }
  }

  async function pay() {
    setCreating(true);
    setError('');
    // The price comes from the stored offer on the server — never from here.
    const r = await post('/payments/order', { offer_id: offer.id, wallet_apply_inr: walletApply });
    if (!r.ok) {
      toast.error(r.error || 'Could not start the payment');
      setCreating(false);
      return;
    }

    // Mock / test-mode orders settle straight through, with no gateway.
    if (r.mocked || !r.key_id) {
      setStep('processing');
      setCreating(false);
      setTimeout(() => settle({
        razorpay_order_id: r.order_id,
        razorpay_payment_id: 'pay_test_' + Date.now(),
        razorpay_signature: 'test',
      }), 1400);
      return;
    }

    if (!window.Razorpay) {
      toast.error('Razorpay checkout could not load. Check your connection.');
      setCreating(false);
      return;
    }
    const checkout = new window.Razorpay({
      key: r.key_id, amount: r.amount, currency: r.currency, order_id: r.order_id,
      name: 'BoliBazzar', description: `${offer.supplier_name} · ${formatINR(r.final_amount_inr)}`,
      prefill: { name: user?.name || 'Buyer', email: user?.email || '' },
      theme: { color: '#a21caf' },
      handler: (response) => { setStep('processing'); settle(response); },
      modal: { ondismiss: () => setCreating(false) },
    });
    checkout.on('payment.failed', (e) => {
      setError(e?.error?.description || 'The payment was declined.');
      setStep('fail');
    });
    checkout.open();
    setCreating(false);
  }

  function shareOnWhatsApp() {
    const text = `\u{1F389} Just got an amazing deal on BoliBazzar!\n\n${offer.supplier_name}: ${formatINR(offer.price_inr)}\nDelivery: ${offer.delivery_note}\n${offer.extras ? '\u2728 ' + offer.extras + '\n' : ''}\nTry BoliBazzar - India's AI reverse marketplace where suppliers compete for YOUR business:\n${typeof window !== 'undefined' ? window.location.origin : ''}`;
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md bg-background/95 border-white/10">
        {step === 'review' && (<>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-fuchsia-400" />Complete your purchase</DialogTitle>
            <DialogDescription>{offer.supplier_name}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(offer.price_inr)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span className="text-emerald-400">FREE</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform fee</span><span className="text-emerald-400">₹0</span></div>
            {walletApply > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-400">Wallet applied</span><span className="text-emerald-400">−{formatINR(walletApply)}</span></div>}
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{formatINR(finalAmount)}</span></div>
          </div>
          {user && walletBal > 0 && (
            <button onClick={() => setUseWallet(v => !v)} className={`mt-3 w-full rounded-xl border p-3 flex items-center justify-between transition ${useWallet ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
              <div className="flex items-center gap-2">
                <Wallet className={`w-4 h-4 ${useWallet ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <div className="text-sm font-medium">Use BoliBazzar wallet</div>
                  <div className="text-xs text-muted-foreground">Balance {formatINR(walletBal)}</div>
                </div>
              </div>
              <div className={`h-5 w-9 rounded-full transition ${useWallet ? 'bg-emerald-500' : 'bg-white/10'} relative`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${useWallet ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Shield className="w-3.5 h-3.5" />Secured by Razorpay · UPI · Cards · Netbanking · Wallets
          </div>
          <Button onClick={pay} disabled={creating} className="w-full mt-2 bg-gradient-to-br from-indigo-600 to-orange-500 h-11">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}Pay {formatINR(finalAmount)}
          </Button>
        </>)}
        {step === 'processing' && (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-fuchsia-400" />
            <div className="mt-4 font-semibold">Processing your payment...</div>
            <div className="text-sm text-muted-foreground">Do not close this window</div>
          </div>
        )}
        {step === 'success' && (
          <SuccessCelebration offer={offer} tier={tier} cashback={cashback} shareOnWhatsApp={shareOnWhatsApp} onClose={onClose} />
        )}
        {step === 'fail' && (
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 grid place-items-center mx-auto"><X className="w-8 h-8 text-red-400" /></div>
            <div className="mt-4 text-xl font-semibold">Payment failed</div>
            {error && <div className="mt-2 text-sm text-muted-foreground px-4">{error}</div>}
            <Button className="mt-6 w-full" onClick={() => { setError(''); setStep('review'); }}>Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ HERO ============
function Hero({ onSubmit, loading }) {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef(null);

  function toggleListen() {
    const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SR) { toast.error('Voice not supported in this browser. Try Chrome or Safari.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let full = '';
      for (let i = 0; i < ev.results.length; i++) full += ev.results[i][0].transcript;
      setInterim(full);
      if (ev.results[ev.results.length - 1].isFinal) setText(prev => (prev ? prev + ' ' : '') + full);
    };
    rec.onend = () => { setListening(false); setInterim(''); };
    rec.onerror = (e) => { setListening(false); setInterim(''); if (e.error !== 'aborted') toast.error('Voice error: ' + e.error); };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-orange-500/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/10 blur-3xl" />
      </div>
      <div className="container mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
        <Badge variant="outline" className="mb-6 px-4 py-1.5 border-white/20 bg-white/5 backdrop-blur text-sm">
          <Sparkles className="w-3.5 h-3.5 mr-2 text-orange-400" />India&apos;s first AI Reverse Marketplace
        </Badge>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          <span className="text-foreground">You Ask.</span>{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Sellers Compete.</span>{' '}
          <span className="text-foreground">You Win.</span>
        </motion.h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          No endless scrolling. Speak or type in <span className="text-foreground">English, Hindi, Tamil, Marathi</span> — our AI understands and verified suppliers bid live.
        </p>
        <div className="mt-10 max-w-3xl mx-auto">
          <div className="group relative rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl shadow-fuchsia-500/5 p-2">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/30 to-orange-500/40 opacity-0 group-focus-within:opacity-100 transition -z-10 blur-md" />
            <div className="flex items-start gap-2 p-3">
              <div className="pt-2.5 pl-1 text-fuchsia-400"><Sparkles className="w-5 h-5" /></div>
              <Textarea value={interim ? text + (text ? ' ' : '') + interim : text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSubmit(text); } }} placeholder="What would you like to buy today? e.g. iPhone 17 Pro Max 256GB Black under ₹1,20,000..." className="min-h-[64px] resize-none border-0 bg-transparent text-base md:text-lg focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60" />
              <div className="flex flex-col gap-2">
                <Button onClick={toggleListen} size="lg" variant={listening ? 'default' : 'outline'} className={`h-12 w-12 rounded-2xl p-0 ${listening ? 'bg-red-500 hover:bg-red-600 border-0 animate-pulse' : 'border-white/20 bg-white/5'}`} title={listening ? 'Stop listening' : 'Voice search'}>
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button onClick={() => text.trim() && onSubmit(text)} disabled={loading || !text.trim()} size="lg" className="h-12 px-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-orange-500 hover:opacity-90 text-white shadow-lg shadow-fuchsia-500/20">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Ask AI</>}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 pb-1 pt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Languages className="w-3.5 h-3.5" />
                {[['en-IN','English'],['hi-IN','हिंदी'],['ta-IN','தமிழ்'],['mr-IN','मराठी'],['bn-IN','বাংলা']].map(([v,l]) => (
                  <button key={v} onClick={() => setLang(v)} className={`px-2 py-0.5 rounded-full text-xs ${lang === v ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'hover:bg-white/5'}`}>{l}</button>
                ))}
              </div>
              {listening && <div className="text-xs text-red-400 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />Listening...</div>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setText(ex)} className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition">{ex}</button>
            ))}
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[{v:'12,400+',l:'Verified suppliers'},{v:'₹42Cr',l:'Requirements matched'},{v:'<45s',l:'First offer arrives'},{v:'18%',l:'Avg. savings'}].map(s => (
            <div key={s.l} className="text-center"><div className="text-2xl md:text-3xl font-semibold">{s.v}</div><div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RequirementPreview({ requirement, onConfirm, onCancel, confirming }) {
  useEffect(() => {
    if (requirement?.summary) {
      const lang = LANG_TO_TTS[requirement.detected_language] || 'en-IN';
      speak(requirement.summary, lang);
    }
    return () => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, [requirement?.summary, requirement?.detected_language]);
  if (!requirement) return null;
  const rows = [['Product',requirement.product],['Brand',requirement.brand],['Model',requirement.model],['Storage',requirement.storage],['RAM',requirement.ram],['Colour',requirement.colour],['Size',requirement.size],['Budget',requirement.budget_inr ? formatINR(requirement.budget_inr) : null],['Location',requirement.location],['Delivery',requirement.delivery_preference],['Quantity',requirement.quantity]].filter(([,v]) => v != null && v !== '');
  const lang = LANG_TO_TTS[requirement.detected_language] || 'en-IN';
  return (
    <Dialog open onOpenChange={o => !o && onCancel()}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl"><Sparkles className="w-5 h-5 text-fuchsia-400" />AI understood your requirement</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{requirement.summary}</span>
            <button onClick={() => speak(requirement.summary, lang)} className="text-fuchsia-400 hover:text-fuchsia-300 shrink-0" title="Play again">
              <Volume2 className="w-4 h-4" />
            </button>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 my-4">
          {rows.map(([k,v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="font-medium mt-0.5">{String(v)}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Edit request</Button>
          <Button onClick={onConfirm} disabled={confirming} className="bg-gradient-to-br from-indigo-600 to-orange-500">
            {confirming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending to suppliers...</> : <>Send to suppliers<ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OfferCard({ offer, onAccept, onChat, onTrack, bestPrice }) {
  const showAiPick = offer.ai_pick === true;
  const isCheapest = offer.price_inr === bestPrice;
  const isHighlighted = showAiPick || isCheapest;
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl border p-5 ${isHighlighted ? 'border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/[0.06] to-violet-500/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}>
      {showAiPick && <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-indigo-600 to-orange-500 border-0"><Sparkles className="w-3 h-3 mr-1" />AI Pick · Best value</Badge>}
      {!showAiPick && isCheapest && <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-cyan-500 to-blue-600 border-0"><Award className="w-3 h-3 mr-1" />Lowest price</Badge>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 border border-white/10"><AvatarFallback className="bg-transparent font-semibold">{offer.supplier_name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
          <div>
            <div className="font-semibold">{offer.supplier_name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="capitalize">{(offer.supplier_type||'').replace('_',' ')}</span><span>·</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{offer.rating} ({offer.reviews})</span>
              {offer.distance_km != null && (<><span>·</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{offer.distance_km} km</span></>)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-2 justify-end">
            {offer.previous_price && offer.previous_price > offer.price_inr && (
              <span className="text-sm text-red-400 line-through">{formatINR(offer.previous_price)}</span>
            )}
            <div className="text-2xl font-bold">{formatINR(offer.price_inr)}</div>
          </div>
          {offer.previous_price && offer.previous_price > offer.price_inr && (
            <div className="text-[10px] text-emerald-400 flex items-center gap-0.5 justify-end"><TrendingDown className="w-3 h-3" />just dropped</div>
          )}
          <div className="text-xs text-muted-foreground">Valid {offer.validity_hours}h</div>
          {offer.value_score != null && (
            <div className="mt-1 flex items-center gap-1.5 justify-end">
              <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{width:`${offer.value_score}%`}} /></div>
              <span className="text-[10px] text-muted-foreground">AI {offer.value_score}</span>
            </div>
          )}
        </div>
      </div>
      {offer.rationale && (
        <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          <span className="text-muted-foreground">Why AI ranks this:</span>
          <span className="text-foreground/90">{offer.rationale}</span>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-cyan-400" />{offer.delivery_note}</div>
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" />{offer.warranty}</div>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />{offer.delivery_days === 0 ? 'Same-day' : `${offer.delivery_days} day(s)`}</div>
      </div>
      {offer.extras && <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300 flex items-center gap-2"><Percent className="w-4 h-4" />{offer.extras}</div>}
      {offer.message && <div className="mt-3 text-sm text-muted-foreground italic">"{offer.message}"</div>}
      <div className="mt-4 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => onChat(offer)}><MessageSquare className="w-4 h-4 mr-2" />Chat</Button>
        {offer.status === 'accepted' && (
          <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10" onClick={() => onTrack(offer)}>
            <Truck className="w-4 h-4 mr-2" />Track delivery
          </Button>
        )}
        <Button size="sm" disabled={offer.status === 'accepted' || offer.status === 'rejected'} onClick={() => onAccept(offer)} className={showAiPick ? 'bg-gradient-to-br from-indigo-600 to-orange-500' : ''}>
          {offer.status === 'accepted' ? <><Check className="w-4 h-4 mr-2" />Accepted</> : offer.status === 'rejected' ? 'Closed' : <>Accept & Pay<ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </motion.div>
  );
}

// ============ BIDDING COUNTDOWN ============
function BiddingCountdown({ auction }) {
  // Tick the displayed clock locally between server polls so it counts smoothly.
  const [seconds, setSeconds] = useState(auction?.seconds_remaining ?? 0);
  useEffect(() => { setSeconds(auction?.seconds_remaining ?? 0); }, [auction?.seconds_remaining]);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const total = auction?.window_seconds || 120;
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const hot = seconds < 20;
  return (
    <div className={`rounded-2xl border p-4 mb-6 ${hot ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/[0.03]'}`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-full ${hot ? 'bg-red-500/20 animate-pulse' : 'bg-amber-500/20'} grid place-items-center`}>
            <Timer className={`w-4.5 h-4.5 ${hot ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2">Live bidding open <Flame className={`w-4 h-4 ${hot ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} /></div>
            <div className="text-xs text-muted-foreground">Suppliers can drop their prices to win you. Watch offers refresh below.</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold tabular-nums ${hot ? 'text-red-400' : 'text-amber-300'}`}>{seconds}s</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">remaining</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full transition-all duration-1000 ${hot ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-fuchsia-500'}`} style={{width:`${pct}%`}} />
      </div>
    </div>
  );
}

function BiddingClosedBanner() {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 mb-6 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-emerald-500/20 grid place-items-center"><Check className="w-4.5 h-4.5 text-emerald-400" /></div>
        <div>
          <div className="font-semibold">Bidding closed · prices locked</div>
          <div className="text-xs text-muted-foreground">Pick your winning offer below. Suppliers can still chat with you.</div>
        </div>
      </div>
    </div>
  );
}

// ============ SUPPLIER ANALYTICS ============
function SupplierAnalytics({ supplier }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api('/analytics/supplier');
      if (r.ok) setData(r);
      setLoading(false);
    })();
  }, [supplier?.id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-fuchsia-400" />
          <div>
            <div className="font-semibold">Your analytics</div>
            <div className="text-xs text-muted-foreground">Live performance for {supplier?.business_name}</div>
          </div>
        </div>
        {data?.stats?.revenue_inr > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</div>
            <div className="text-xl font-semibold text-emerald-400">{formatINR(data.stats.revenue_inr)}</div>
          </div>
        )}
      </div>
      {loading ? <div className="text-muted-foreground text-sm">Loading...</div> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard icon={<Package className="w-4 h-4 text-cyan-400" />} label="Open requests" value={data.stats.open_requests} sub={`${data.stats.total_requests_available} total`} />
            <StatCard icon={<Send className="w-4 h-4 text-fuchsia-400" />} label="Offers submitted" value={data.stats.offers_submitted} />
            <StatCard icon={<Trophy className="w-4 h-4 text-amber-400" />} label="Won" value={data.stats.offers_won} />
            <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Win rate" value={`${data.stats.win_rate_pct}%`} />
            <StatCard icon={<TrendingDown className="w-4 h-4 text-red-400" />} label="Avg. price gap" value={data.stats.avg_price_gap_pct > 0 ? `+${data.stats.avg_price_gap_pct}%` : '—'} sub="above winner" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" />Hot buyer cities</div>
              {data.hot_cities.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
              {data.hot_cities.map(c => (
                <div key={c.city} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2"><MapPin className="w-3 h-3 text-muted-foreground" />{c.city}</span>
                  <span className="text-muted-foreground">{c.count} request{c.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-fuchsia-400" />Hot categories</div>
              {data.hot_categories.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
              {data.hot_categories.map(c => (
                <div key={c.sub_category} className="flex items-center justify-between py-1.5 text-sm capitalize">
                  <span>{c.sub_category.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function OffersView({ request, offers, auction, onAccept, onChat, onTrack, refreshing, user }) {
  const bidClosed = !auction?.live || request?.status === 'closed';
  const bestPrice = offers.length ? Math.min(...offers.map(o => o.price_inr)) : null;
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />Live request · {new Date(request.created_at).toLocaleString('en-IN')}</div>
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
        <div className="text-right"><div className="text-sm text-muted-foreground">Offers received</div><div className="text-3xl font-bold">{offers.length}</div></div>
      </div>

      {!bidClosed && <BiddingCountdown auction={auction} />}
      {bidClosed && request.status !== 'closed' && <BiddingClosedBanner />}
      <GroupBuyBanner request={request} user={user} />

      {refreshing && !offers.length && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="inline-flex items-center gap-3 text-lg"><Loader2 className="w-5 h-5 animate-spin text-fuchsia-400" />Notifying verified suppliers...</div>
          <div className="mt-3 text-sm text-muted-foreground">Our AI is matching your requirement with top electronics suppliers in India.</div>
        </div>
      )}
      <div className="grid gap-4">
        <AnimatePresence>
          {offers.map(o => <OfferCard key={o.id} offer={o} onAccept={onAccept} onChat={onChat} onTrack={onTrack} bestPrice={bestPrice} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [{n:1,t:'Tell AI what you want',d:'Type your requirement in plain English or Hindi.',icon:Sparkles},{n:2,t:'AI structures your request',d:'Product, brand, model, budget, location extracted automatically.',icon:Search},{n:3,t:'Verified suppliers get notified',d:'Only matching, GST-verified sellers. No spam.',icon:Bell},{n:4,t:'Suppliers compete',d:'Prices drop as sellers bid live to win you.',icon:TrendingDown},{n:5,t:'Compare in one table',d:'Price, delivery, warranty, rating side by side.',icon:Package},{n:6,t:'Chat, pay, done',d:'Negotiate on chat, pay with UPI, track till delivery.',icon:ShoppingBag}];
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="text-center mb-14"><Badge variant="outline" className="mb-4">How it works</Badge><h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Six steps. Zero scrolling.</h2></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map(s => (
          <div key={s.n} className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition p-6">
            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-white/10 grid place-items-center"><s.icon className="w-5 h-5 text-fuchsia-300" /></div><div className="text-sm text-muted-foreground">Step {s.n}</div></div>
            <div className="mt-4 text-xl font-semibold">{s.t}</div><div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
function FeaturedElectronics() {
  const items = [{k:'smartphone',t:'Smartphones',d:'iPhone, Samsung, OnePlus, Pixel'},{k:'laptop',t:'Laptops',d:'MacBook, Dell, HP, Lenovo, Asus'},{k:'gaming_console',t:'Gaming',d:'PS6, Xbox, Nintendo, PC parts'},{k:'smartwatch',t:'Wearables',d:'Apple Watch, Garmin, Samsung'}];
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8"><div><Badge variant="outline" className="mb-3">Category · Electronics</Badge><h2 className="text-3xl md:text-4xl font-semibold">Everything electronics.</h2></div><div className="text-sm text-muted-foreground hidden md:block">More categories launching soon.</div></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i.k} className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-fuchsia-500/30 transition">
            <div className="aspect-[4/3] overflow-hidden bg-black/30"><img src={PRODUCT_IMAGES[i.k]} alt={i.t} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" /></div>
            <div className="p-4"><div className="font-semibold">{i.t}</div><div className="text-sm text-muted-foreground">{i.d}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}
function FAQ() {
  const q = [{q:'How is this different from Amazon or Flipkart?',a:"On BoliBazzar you don't search. Describe what you want, verified suppliers compete to sell it at the best price."},{q:'Is it free for buyers?',a:'Yes. Buyers pay zero platform fees. Suppliers pay a small commission on completed orders only.'},{q:'Are suppliers verified?',a:'Every supplier goes through GST, business, address and brand authorisation checks before joining.'},{q:'Can I negotiate?',a:'Yes — every offer has a built-in chat with the supplier.'},{q:'Which categories are live?',a:'Electronics is live now. Furniture, Cars, Bikes, Home Services and more coming.'}];
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10"><Badge variant="outline" className="mb-3">FAQ</Badge><h2 className="text-4xl font-semibold">Questions, answered.</h2></div>
        <Accordion type="single" collapsible className="w-full">
          {q.map((x,i)=>(<AccordionItem key={i} value={`i${i}`} className="border-white/10"><AccordionTrigger className="text-left hover:no-underline">{x.q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{x.a}</AccordionContent></AccordionItem>))}
        </Accordion>
      </div>
    </section>
  );
}
function Footer() { return (<footer className="border-t border-white/10 mt-16"><div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-2"><BoliBazzarLogo size={32} showWordmark /><span className="text-muted-foreground text-sm hidden md:inline">· You Ask. Sellers Compete. You Win.</span></div><div className="text-xs text-muted-foreground">© 2025 BoliBazzar Technologies · Made for Bharat</div></div></footer>); }

function Navbar({ view, setView, user, booting, onLogin, onLogout, onSupplierSignup, wallet, tier }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => setView('home')} className="flex items-center gap-2">
          <BoliBazzarLogo size={34} />
          <div className="leading-none">
            <div className="font-bold text-lg tracking-tight">
              <span className="text-foreground">Boli</span>
              <span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span>
            </div>
          </div>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant={view === 'home' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('home')}><ShoppingBag className="w-4 h-4 mr-2" />Buy</Button>
          {user && <Button variant={view === 'my_requests' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('my_requests')}><ClipboardList className="w-4 h-4 mr-2" />My requests</Button>}
          {user && <Button variant={view === 'orders' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('orders')}><Package className="w-4 h-4 mr-2" />Orders</Button>}
          <Button variant={view === 'supplier' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('supplier')}><Store className="w-4 h-4 mr-2" />Supplier</Button>
        </nav>
        <div className="flex items-center gap-2">
          <NotificationBell enabled={!!user} />
          <ThemeToggle />
          {user && wallet && wallet.balance_inr > 0 && (
            <button onClick={() => setView('wallet')} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm hover:bg-emerald-500/20 transition">
              <Wallet className="w-4 h-4" />{formatINR(wallet.balance_inr)}
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={onSupplierSignup} className="hidden md:inline-flex"><Building2 className="w-4 h-4 mr-2" />Sell on BoliBazzar</Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7"><AvatarImage src={user.picture} /><AvatarFallback className="text-xs bg-fuchsia-500/20">{user.name.slice(0,1)}</AvatarFallback></Avatar>
                  <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel><div className="flex items-center gap-2">{user.name}{tier && <TierBadge tier={tier} small />}</div><div className="text-xs text-muted-foreground font-normal">{user.email}</div></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView('my_requests')}><ClipboardList className="w-4 h-4 mr-2" />My requests</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('orders')}><Package className="w-4 h-4 mr-2" />My orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('wallet')}><Wallet className="w-4 h-4 mr-2" />Wallet <span className="ml-auto text-xs text-emerald-400">{formatINR(wallet?.balance_inr || 0)}</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('stationery')}><Mail className="w-4 h-4 mr-2" />Emails preview</DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : booting ? (
            <div className="h-8 w-20 rounded-md bg-white/5 animate-pulse" />
          ) : (
            <Button size="sm" onClick={onLogin} className="bg-white text-black hover:bg-white/90">Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ============ ORDERS ============
const STAGE_LABELS = {
  confirmed: 'Order confirmed', packed: 'Packed at store', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered',
};

function OrdersView({ onTrack, onReview }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await api('/orders');
    if (r.ok) setOrders(r.orders || []);
    setLoading(false);
  }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  return (
    <div className="container mx-auto px-6 py-12">
      <Badge variant="outline" className="mb-3"><Package className="w-3 h-3 mr-1" />Your orders</Badge>
      <h1 className="text-4xl font-semibold">Orders &amp; deliveries</h1>
      <p className="text-muted-foreground mt-2">Everything you&apos;ve bought, and exactly where it is right now.</p>

      {loading ? (
        <div className="mt-8 text-muted-foreground">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-muted-foreground">
          No orders yet. Post a requirement and accept a winning offer.
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {orders.map(o => {
            const delivered = o.stage === 'delivered';
            return (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={`h-2 w-2 rounded-full ${delivered ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      {STAGE_LABELS[o.stage] || o.stage} · {o.tracking_id}
                    </div>
                    <div className="text-lg font-semibold mt-1">{o.product}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {o.supplier_name} · {o.from_city} → {o.to_city}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{formatINR(o.amount_inr)}</Badge>
                      <Badge variant="outline"><Truck className="w-3 h-3 mr-1" />{o.courier}</Badge>
                      {o.wallet_used_inr > 0 && <Badge variant="outline" className="text-emerald-300 border-emerald-500/30">Wallet −{formatINR(o.wallet_used_inr)}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10" onClick={() => onTrack({ id: o.offer_id, supplier_name: o.supplier_name })}>
                      <Truck className="w-4 h-4 mr-2" />Track
                    </Button>
                    {delivered && (
                      <Button size="sm" onClick={() => onReview({ id: o.offer_id, supplier_name: o.supplier_name, price_inr: o.amount_inr })}>
                        <Star className="w-4 h-4 mr-2" />Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyRequests({ user, onOpen }) {
  const [reqs, setReqs] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api('/me'); setReqs(r.requests || []); setLoading(false); })(); }, [user.email]);
  return (
    <div className="container mx-auto px-6 py-12">
      <Badge variant="outline" className="mb-3"><ClipboardList className="w-3 h-3 mr-1" />Your requests</Badge>
      <h1 className="text-4xl font-semibold">Welcome back, {user.name.split(' ')[0]}</h1>
      <p className="text-muted-foreground mt-2">All your buying requests and offers in one place.</p>
      {loading ? <div className="mt-8 text-muted-foreground">Loading...</div> : reqs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-muted-foreground">No requests yet. Go to Buy and ask AI what you want.</div>
      ) : (
        <div className="mt-8 grid gap-3">
          {reqs.map(r => (
            <button key={r.id} onClick={() => onOpen(r)} className="text-left rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className={`h-2 w-2 rounded-full ${r.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />{r.status.toUpperCase()} · {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                  <div className="text-lg font-semibold mt-1">{r.requirement.summary || r.requirement.product}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierDashboard({ onSignup }) {
  const [supplier, setSupplier] = useState(null);
  const [booting, setBooting] = useState(true);
  const [auth, setAuth] = useState(null); // { mode: 'signin' | 'signup' } | null
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ price_inr: '', delivery_days: '2', delivery_note: 'Next-day delivery', warranty: '1 year manufacturer', validity_hours: '24', extras: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function loadSession() {
    const s = await api('/auth/session');
    setSupplier(s.supplier || null);
    setBooting(false);
  }
  useEffect(() => { loadSession(); }, []);

  async function load() {
    if (!supplier) { setLoading(false); return; }
    setLoading(true);
    const [feed, ord] = await Promise.all([api('/requests'), api('/orders')]);
    if (feed.ok) setRequests(feed.requests || []);
    if (ord.ok) setOrders(ord.orders || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [supplier?.id]);
  // Keep the feed fresh so new buyer requests appear without a refresh.
  useEffect(() => {
    if (!supplier) return;
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [supplier?.id]);

  async function submitOffer() {
    if (!selected) return;
    setSubmitting(true);
    const r = await post(`/requests/${selected.id}/offers`, {
      ...form,
      price_inr: Number(form.price_inr),
      delivery_days: Number(form.delivery_days),
      validity_hours: Number(form.validity_hours),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success(r.updated ? 'Your bid was updated' : 'Offer sent to the buyer');
      setSelected(null);
      load();
    } else {
      toast.error(r.error || 'Could not send that offer');
    }
  }

  async function advance(order, stage) {
    const r = await post(`/orders/${order.id}/stage`, { stage });
    if (r.ok) { toast.success('Marked ' + stage.replace(/_/g, ' ')); load(); }
    else toast.error(r.error || 'Could not update that order');
  }

  async function signOut() {
    await api('/auth/session', { method: 'DELETE', body: JSON.stringify({ role: 'supplier' }) });
    setSupplier(null); setRequests([]); setOrders([]);
  }

  // --- not signed in -------------------------------------------------------
  if (booting) return <div className="container mx-auto px-6 py-24 text-center text-muted-foreground">Loading supplier console...</div>;

  if (!supplier) {
    return (
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-orange-500/20 border border-white/10 grid place-items-center mx-auto">
            <Store className="w-7 h-7 text-fuchsia-400" />
          </div>
          <h1 className="text-3xl font-semibold mt-5">Supplier console</h1>
          <p className="text-muted-foreground mt-2">Sign in to see live buyer requests and bid on them. New here? Register your business to get verified.</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button className="bg-gradient-to-br from-indigo-600 to-orange-500" onClick={() => setAuth({ mode: 'signin' })}>Supplier sign in</Button>
            <Button variant="outline" className="border-fuchsia-500/40" onClick={onSignup}><Building2 className="w-4 h-4 mr-2" />Register business</Button>
          </div>
        </div>
        <AuthModal open={!!auth} mode={auth?.mode || 'signin'} role="supplier" onOpenChange={(next) => setAuth(next && next.mode ? next : null)} onAuthed={(_role, account) => setSupplier(account)} />
      </div>
    );
  }

  const pendingApproval = supplier.status !== 'approved';

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <Badge variant="outline" className="mb-3"><Store className="w-3 h-3 mr-1" />Supplier dashboard</Badge>
          <h1 className="text-4xl font-semibold">{supplier.business_name}</h1>
          <p className="text-muted-foreground mt-2">
            {supplier.city ? supplier.city + ' · ' : ''}{supplier.email}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => window.open(`/?store=${encodeURIComponent(supplier.email)}`, '_blank')} variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"><Share2 className="w-4 h-4 mr-2" />My storefront</Button>
          <Button onClick={onSignup} variant="outline" className="border-fuchsia-500/40"><Building2 className="w-4 h-4 mr-2" />Business details</Button>
          <Button onClick={signOut} variant="ghost"><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
        </div>
      </div>

      {pendingApproval && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Account awaiting approval</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              You can see live requests, but bidding unlocks once an admin approves your business. Add your GSTIN under &ldquo;Business details&rdquo; to speed this up.
            </div>
          </div>
        </div>
      )}

      <SupplierAnalytics supplier={supplier} />
      <AutoBidRulesPanel supplier={supplier} />

      {orders.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-semibold">Orders to fulfil</div>
              <div className="text-xs text-muted-foreground">Move each order along as you dispatch it.</div>
            </div>
          </div>
          <div className="grid gap-2">
            {orders.map(o => (
              <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">{o.tracking_id} · {STAGE_LABELS[o.stage] || o.stage}</div>
                  <div className="font-medium mt-0.5">{o.product}</div>
                  <div className="text-sm text-muted-foreground">{formatINR(o.amount_inr)} · {o.to_city}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['packed', 'shipped', 'out_for_delivery', 'delivered']
                    .filter(s => ['confirmed', 'packed', 'shipped', 'out_for_delivery'].indexOf(o.stage) < ['confirmed', 'packed', 'shipped', 'out_for_delivery'].indexOf(s === 'delivered' ? 'out_for_delivery' : s) + 1)
                    .slice(0, 2)
                    .map(s => (
                      <Button key={s} size="sm" variant="outline" onClick={() => advance(o, s)} className="capitalize">
                        Mark {s.replace(/_/g, ' ')}
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">Live buyer requests</h2>
      {loading && <div className="text-muted-foreground">Loading...</div>}
      <div className="grid gap-3">
        {requests.map(r => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${r.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  {r.status.toUpperCase()} · {new Date(r.created_at).toLocaleString('en-IN')}
                </div>
                <div className="text-lg font-semibold mt-1">{r.requirement.summary || r.requirement.product}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.requirement.brand && <Badge variant="outline">{r.requirement.brand}</Badge>}
                  {r.requirement.model && <Badge variant="outline">{r.requirement.model}</Badge>}
                  {r.requirement.storage && <Badge variant="outline">{r.requirement.storage}</Badge>}
                  {r.requirement.budget_inr && <Badge variant="outline">Budget {formatINR(r.requirement.budget_inr)}</Badge>}
                  {r.requirement.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{r.requirement.location}</Badge>}
                  <Badge variant="outline">Qty {r.requirement.quantity}</Badge>
                </div>
                {r.my_offer && (
                  <div className="mt-2 text-xs text-fuchsia-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />You bid {formatINR(r.my_offer.price_inr)} · {r.my_offer.status}
                  </div>
                )}
              </div>
              <Button
                disabled={r.status !== 'open' || pendingApproval}
                onClick={() => {
                  setSelected(r);
                  setForm(f => ({
                    ...f,
                    price_inr: r.my_offer ? String(r.my_offer.price_inr) : r.requirement.budget_inr ? String(Math.round(r.requirement.budget_inr * 0.95)) : '',
                  }));
                }}
              >
                {r.my_offer ? 'Update bid' : 'Submit offer'}<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && !requests.length && <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-muted-foreground">No live requests right now. They appear here the moment a buyer posts one.</div>}
      </div>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle>{selected?.my_offer ? 'Update your bid' : 'Submit your offer'}</DialogTitle>
            <DialogDescription>{selected?.requirement?.summary}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Price (₹)</label><Input type="number" value={form.price_inr} onChange={e => setForm({ ...form, price_inr: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Delivery days</label><Input type="number" min="0" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Delivery note</label><Input value={form.delivery_note} onChange={e => setForm({ ...form, delivery_note: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Warranty</label><Input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Extras</label><Input value={form.extras} onChange={e => setForm({ ...form, extras: e.target.value })} placeholder="Free case + HDFC 10% off" /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Message to buyer</label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={2} /></div>
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

// ============ REVIEW MODAL ============
function ReviewModal({ offer, user, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const TAG_OPTS = ['Fast delivery', 'Great price', 'Perfect packaging', 'Genuine product', 'Helpful supplier', 'Would buy again'];
  function toggleTag(t) { setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); }
  async function submit() {
    setSaving(true);
    const r = await post('/reviews', { offer_id: offer.id, rating, title, comment, tags });
    if (r.ok) { toast.success('Thanks! Your review helps other buyers.'); onSubmitted(r.review); onClose(); }
    else toast.error(r.error || 'Failed');
    setSaving(false);
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md bg-background/95 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">Rate your experience</DialogTitle>
          <DialogDescription>How was buying from <span className="text-foreground">{offer.supplier_name}</span>?</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-2 my-4">
          {[1,2,3,4,5].map(n => (
            <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
              <Star className={`w-9 h-9 ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {TAG_OPTS.map(t => (
            <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1 rounded-full text-xs border transition ${tags.includes(t) ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200' : 'border-white/10 hover:border-white/20 text-muted-foreground'}`}>{t}</button>
          ))}
        </div>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sum it up in one line (optional)" />
        <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell other buyers what stood out..." rows={3} />
        <Button onClick={submit} disabled={saving} className="w-full bg-gradient-to-br from-indigo-600 to-orange-500">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}Submit review
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============ WALLET VIEW ============
function WalletView({ user, wallet, tier, refresh }) {
  useEffect(() => { refresh?.(); }, []);
  const tx = wallet?.transactions || [];
  const spent = user?.total_spent_inr || 0;
  const nextAt = tier?.next_tier_at;
  const progress = nextAt ? Math.min(100, Math.round((spent / nextAt) * 100)) : 100;
  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl">
      <Badge variant="outline" className="mb-3"><Wallet className="w-3 h-3 mr-1" />Your wallet</Badge>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-4xl font-semibold">BoliBazzar wallet</h1>
        {tier && <TierBadge tier={tier} />}
      </div>
      <p className="text-muted-foreground mt-2">Earn <span className="text-foreground font-medium">{tier?.cashback_pct || 2}%</span> {tier?.label || 'Silver'} cashback on every purchase. Apply on any future order.</p>
      <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-cyan-500/[0.04] p-8">
        <div className="text-sm text-emerald-300/80">Available balance</div>
        <div className="text-5xl font-bold mt-1">{formatINR(wallet?.balance_inr || 0)}</div>
        <div className="mt-4 text-sm text-muted-foreground">{tx.length} transaction{tx.length === 1 ? '' : 's'} · Cashback credited on delivery</div>
      </div>

      {/* Tier progress */}
      {tier && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Loyalty tier</div>
              <div className="mt-1 flex items-center gap-2"><span className="text-2xl font-semibold">{tier.label}</span><Crown className="w-5 h-5" style={{color: tier.color}} /></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total spent</div>
              <div className="font-semibold">{formatINR(spent)}</div>
            </div>
          </div>
          {nextAt ? (
            <>
              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${tier.badge_gradient}`} style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{tier.label}</span>
                <span>{formatINR(Math.max(0, nextAt - spent))} to <span className="text-foreground">{tier.next_label}</span></span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Unlock priority offers + higher cashback at every tier</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-fuchsia-300">🏆 You&apos;ve hit our highest tier. Max cashback + priority offers unlocked.</div>
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Recent activity</div>
        {tx.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-muted-foreground text-sm">No transactions yet. Complete your first order to earn cashback.</div>}
        <div className="space-y-2">
          {tx.slice().reverse().map(t => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full grid place-items-center ${t.type === 'credit' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {t.type === 'credit' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.reason}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div className={`font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type === 'credit' ? '+' : '−'}{formatINR(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ AUTO-BID RULES PANEL (in supplier dashboard) ============
function AutoBidRulesPanel({ supplier }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: 'Apple smartphones auto-bid', brand: 'Apple', sub_category: 'smartphone', discount_pct: '5', delivery_days: '1', warranty: '1 year manufacturer', extras: 'Free case', validity_hours: '24', message: 'Ready to dispatch today!' });
  async function load() { setLoading(true); const r = await api('/supplier/rules'); setRules(r.rules || []); setLoading(false); }
  useEffect(() => { load(); }, [supplier?.id]);
  async function create() {
    setCreating(true);
    const r = await post('/supplier/rules', f);
    if (r.ok) { toast.success('Auto-bid rule live. You will auto-offer on matching requests.'); load(); }
    else toast.error(r.error || 'Could not create that rule');
    setCreating(false);
  }
  async function toggle(id) { await post(`/supplier/rules/${id}/toggle`); load(); }
  async function remove(id) { await api(`/supplier/rules/${id}`, { method: 'DELETE' }); load(); toast.success('Rule deleted'); }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-fuchsia-400" />
          <div>
            <div className="font-semibold">Auto-bid rules</div>
            <div className="text-xs text-muted-foreground">Set price rules — we&apos;ll auto-submit offers when matching requests drop</div>
          </div>
        </div>
      </div>
      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
        <div className="space-y-2 mb-4">
          {rules.length === 0 && <div className="text-sm text-muted-foreground">No rules yet. Create one below to start auto-bidding.</div>}
          {rules.map(r => (
            <div key={r.id} className={`rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap ${r.enabled ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-white/10 bg-white/[0.02] opacity-70'}`}>
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium flex items-center gap-2">{r.name} {r.enabled ? <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">ACTIVE</Badge> : <Badge variant="outline" className="text-[10px]">PAUSED</Badge>}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.brand && <span>{r.brand} · </span>}
                  {r.sub_category !== 'any' && <span className="capitalize">{r.sub_category.replace('_', ' ')} · </span>}
                  Bid <span className="text-fuchsia-300">{r.discount_pct}% below budget</span> · {r.delivery_days === 0 ? 'Same-day' : `${r.delivery_days}d`} delivery
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggle(r.id)}><Power className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.03] p-3">
        <div className="text-xs font-medium mb-2 text-fuchsia-200 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />New rule</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Rule name" className="col-span-2 h-9" />
          <Input value={f.brand} onChange={e => setF({...f, brand: e.target.value})} placeholder="Brand (e.g. Apple)" className="h-9" />
          <select value={f.sub_category} onChange={e => setF({...f, sub_category: e.target.value})} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="any">Any category</option>
            <option value="smartphone">Smartphone</option>
            <option value="laptop">Laptop</option>
            <option value="tv">TV</option>
            <option value="tablet">Tablet</option>
            <option value="gaming_console">Gaming console</option>
            <option value="smartwatch">Smartwatch</option>
            <option value="headphones">Headphones</option>
          </select>
          <div><label className="text-[10px] text-muted-foreground">% below budget</label><Input type="number" value={f.discount_pct} onChange={e => setF({...f, discount_pct: e.target.value})} className="h-9" /></div>
          <div><label className="text-[10px] text-muted-foreground">Delivery days</label><Input type="number" value={f.delivery_days} onChange={e => setF({...f, delivery_days: e.target.value})} className="h-9" /></div>
          <Input value={f.extras} onChange={e => setF({...f, extras: e.target.value})} placeholder="Freebies/extras" className="col-span-2 h-9" />
          <Input value={f.message} onChange={e => setF({...f, message: e.target.value})} placeholder="Auto message to buyer" className="col-span-4 h-9" />
        </div>
        <Button size="sm" onClick={create} disabled={creating} className="mt-3 bg-gradient-to-br from-indigo-600 to-orange-500">
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}Create auto-bid rule
        </Button>
      </div>
    </div>
  );
}

// ============ DELIVERY TRACKER ============
const CITY_XY = {
  // stylised India SVG (viewBox 0 0 400 500). Rough positions.
  Mumbai:[110,275], Delhi:[195,110], Bengaluru:[190,395], Bangalore:[190,395], Chennai:[240,410],
  Hyderabad:[200,335], Pune:[130,290], Kolkata:[320,230], Ahmedabad:[110,220], Jaipur:[155,175],
  Surat:[115,240], Lucknow:[225,155], Kanpur:[225,170], Nagpur:[210,275], Indore:[170,235],
  Bhopal:[190,225], Coimbatore:[195,430], Chandigarh:[180,95], Kochi:[190,455], Goa:[135,340],
};
function DeliveryTracker({ offer, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    async function fetchIt() { const r = await api(`/delivery/${offer.id}`); setData(r.delivery); }
    fetchIt();
    const t = setInterval(fetchIt, 5000);
    return () => clearInterval(t);
  }, [offer.id]);
  if (!data) return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-background/95 border-white/10"><div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-fuchsia-400" /></div></DialogContent>
    </Dialog>
  );
  const from = CITY_XY[data.from_city] || CITY_XY.Mumbai;
  const to = CITY_XY[data.to_city] || CITY_XY.Delhi;
  const progress = data.progress / 100;
  const cx = from[0] + (to[0] - from[0]) * progress;
  const cy = from[1] + (to[1] - from[1]) * progress;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-background/95 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-cyan-400" />Live delivery tracking</DialogTitle>
          <DialogDescription>{offer.supplier_name} · Tracking ID <span className="font-mono text-foreground">{data.tracking_id}</span></DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          {/* Map */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/70 to-indigo-950/50 p-3 relative overflow-hidden">
            <svg viewBox="0 0 400 500" className="w-full h-auto">
              {/* Stylised India outline */}
              <path d="M180 60 L215 85 L245 120 L260 155 L290 180 L305 220 L340 220 L340 260 L320 280 L305 310 L295 340 L280 370 L260 395 L245 420 L230 445 L200 470 L180 465 L170 435 L155 410 L155 385 L145 360 L130 335 L120 305 L110 275 L100 245 L100 210 L110 175 L130 145 L150 115 L170 85 Z" fill="rgba(139,92,246,0.06)" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
              {/* Static city dots */}
              {Object.entries(CITY_XY).slice(0, 12).map(([c, [x, y]]) => (
                <g key={c}>
                  <circle cx={x} cy={y} r="2" fill="rgba(255,255,255,0.25)" />
                </g>
              ))}
              {/* Route line */}
              <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="url(#grad)" strokeWidth="2" strokeDasharray="4 4" />
              <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#a21caf" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient></defs>
              {/* From city */}
              <g>
                <circle cx={from[0]} cy={from[1]} r="6" fill="#a21caf" />
                <circle cx={from[0]} cy={from[1]} r="12" fill="#a21caf" opacity="0.25">
                  <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x={from[0] + 10} y={from[1] + 4} fill="white" fontSize="11" fontWeight="600">{data.from_city}</text>
              </g>
              {/* To city */}
              <g>
                <circle cx={to[0]} cy={to[1]} r="6" fill="#22d3ee" />
                <circle cx={to[0]} cy={to[1]} r="12" fill="#22d3ee" opacity="0.25">
                  <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x={to[0] + 10} y={to[1] + 4} fill="white" fontSize="11" fontWeight="600">{data.to_city}</text>
              </g>
              {/* Moving truck */}
              <g transform={`translate(${cx - 10}, ${cy - 8})`}>
                <rect x="0" y="0" width="20" height="14" rx="3" fill="#fbbf24" />
                <circle cx="4" cy="15" r="2" fill="#1f2937" />
                <circle cx="16" cy="15" r="2" fill="#1f2937" />
              </g>
            </svg>
          </div>
          {/* Status timeline + ETA */}
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.05] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimated arrival</div>
              <div className="text-2xl font-bold mt-1">{data.delivered ? 'Delivered' : (data.eta_days > 1 ? `${data.eta_days} days` : data.eta_minutes > 60 ? `${Math.round(data.eta_minutes / 60)} hours` : `${data.eta_minutes} min`)}</div>
              <div className="text-xs text-muted-foreground mt-1">Via {data.courier}</div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all duration-1000" style={{ width: `${data.progress}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 text-right">{data.progress}%</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              {data.stages.map((s, i) => {
                const done = i <= data.stage_index;
                const active = i === data.stage_index;
                return (
                  <div key={s.key} className="flex items-start gap-3">
                    <div className={`h-6 w-6 rounded-full grid place-items-center shrink-0 mt-0.5 ${done ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5 border border-white/10'}`}>
                      {done ? <Check className="w-3 h-3 text-emerald-400" /> : <div className="h-1.5 w-1.5 rounded-full bg-white/30" />}
                    </div>
                    <div className={`text-sm ${active ? 'font-semibold text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                      {s.label}
                      {active && !data.delivered && <span className="ml-2 text-xs text-cyan-400 animate-pulse">in progress</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ GROUP BUY BANNER ============
function GroupBuyBanner({ request, user }) {
  const [suggestion, setSuggestion] = useState(null);
  const [joining, setJoining] = useState(false);
  useEffect(() => { (async () => { const r = await api(`/requests/${request.id}/group-suggestion`); setSuggestion(r); })(); }, [request.id]);
  if (!suggestion) return null;
  const g = suggestion.existing_group;
  const totalMembers = g ? g.members.length : 1;
  const target = g?.target_size || 5;
  const remaining = Math.max(0, target - totalMembers);

  async function joinOrCreate() {
    if (!user?.email) return toast.error('Sign in to join group buy');
    setJoining(true);
    if (g) {
      const already = g.members.some(m => m.email === user.email);
      if (already) { toast.info('You are already in this group'); setJoining(false); return; }
      const r = await post(`/groups/${g.id}/join`);
      if (r.ok) { toast.success('Joined group buy! Deeper discounts unlocking...'); setSuggestion({ ...suggestion, existing_group: r.group }); }
    } else {
      const r = await post('/groups', { request_id: request.id });
      if (r.ok) { toast.success('Group buy started! Invite friends to unlock bigger discounts.'); setSuggestion({ ...suggestion, existing_group: r.group }); }
    }
    setJoining(false);
  }

  if (!g && suggestion.similar_count === 0) return null;
  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/[0.06] to-blue-500/[0.03] p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-cyan-500/20 grid place-items-center"><Users className="w-5 h-5 text-cyan-400" /></div>
        <div>
          <div className="font-semibold">{g ? `${totalMembers} buyers want the same product` : `${suggestion.similar_count} other buyer${suggestion.similar_count === 1 ? '' : 's'} recently asked for this`}</div>
          <div className="text-xs text-muted-foreground">{g ? `${remaining} more to unlock deeper bulk discount from suppliers` : 'Start a group buy to unlock deeper bulk pricing'}</div>
        </div>
      </div>
      <Button size="sm" onClick={joinOrCreate} disabled={joining} className="bg-gradient-to-br from-cyan-500 to-blue-600">
        {joining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}{g ? 'Join group buy' : 'Start group buy'}
      </Button>
    </div>
  );
}

// ============ TIER BADGE ============
function TierBadge({ tier, small }) {
  if (!tier) return null;
  const cls = tier.tier === 'platinum' ? 'from-slate-300 to-indigo-300 text-slate-900' : tier.tier === 'gold' ? 'from-amber-400 to-yellow-300 text-amber-950' : 'from-slate-400 to-slate-300 text-slate-900';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${cls} font-semibold ${small ? 'text-[10px]' : 'text-xs'}`}>
      <Award className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} />{tier.label}
    </div>
  );
}

// ============ BRAND STORE (public supplier storefront) ============
function BrandStore({ slug, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api(`/store/${encodeURIComponent(slug)}`); if (r.ok) setData(r); setLoading(false); })(); }, [slug]);
  function copyLink() {
    const url = `${window.location.origin}/?store=${encodeURIComponent(slug)}`;
    navigator.clipboard.writeText(url);
    toast.success('Store link copied — share with buyers');
  }
  function shareWA() {
    const url = `${window.location.origin}/?store=${encodeURIComponent(slug)}`;
    const text = `Check out ${data?.supplier?.business_name || 'my store'} on BoliBazzar — verified electronics supplier: ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
  if (loading) return <div className="container mx-auto px-6 py-24 text-center text-muted-foreground">Loading store...</div>;
  if (!data) return (
    <div className="container mx-auto px-6 py-24 text-center">
      <div className="text-2xl font-semibold">Store not found</div>
      <Button className="mt-4" onClick={onClose}>Back to BoliBazzar</Button>
    </div>
  );
  const s = data.supplier;
  const stats = data.stats;
  const brands = s.brand_authorisations || [];
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/25 via-fuchsia-500/15 to-orange-500/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-16 pb-10">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"><ChevronRight className="w-3.5 h-3.5 rotate-180" />Back to marketplace</button>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-orange-500 grid place-items-center shadow-2xl shadow-fuchsia-500/30">
                <Store className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{s.business_name}</h1>
                  {s.gst_valid && <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30"><FileCheck className="w-3 h-3 mr-1" />GST verified</Badge>}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="capitalize">{(s.supplier_type || '').replace('_', ' ')}</span>
                  {s.city && <><span>·</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}</span></>}
                  <span>·</span><span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{stats.avg_rating} ({data.reviews.length} review{data.reviews.length === 1 ? '' : 's'})</span>
                </div>
                {brands.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {brands.slice(0, 6).map(b => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-2" />Copy link</Button>
              <Button onClick={shareWA} className="bg-gradient-to-br from-emerald-500 to-emerald-600"><Share2 className="w-4 h-4 mr-2" />Share on WhatsApp</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            <StatCard icon={<Package className="w-4 h-4 text-cyan-400" />} label="Offers made" value={stats.total_offers} />
            <StatCard icon={<Trophy className="w-4 h-4 text-amber-400" />} label="Deals won" value={stats.accepted} />
            <StatCard icon={<Star className="w-4 h-4 text-yellow-400" />} label="Avg rating" value={stats.avg_rating} />
            <StatCard icon={<Award className="w-4 h-4 text-fuchsia-400" />} label="Brands" value={brands.length} />
          </div>
        </div>
      </section>

      {/* Capabilities (auto-bid rules) */}
      {data.rules.length > 0 && (
        <section className="container mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Bot className="w-3.5 h-3.5" />Instant-quote capabilities</div>
          <div className="grid md:grid-cols-2 gap-3">
            {data.rules.map(r => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.brand && <span>{r.brand} · </span>}
                  {r.sub_category !== 'any' && <span className="capitalize">{r.sub_category.replace('_', ' ')} · </span>}
                  Auto-bids <span className="text-fuchsia-300">{r.discount_pct}% below budget</span> · {r.delivery_days === 0 ? 'Same-day' : `${r.delivery_days}d`} delivery
                </div>
                {r.extras && <div className="mt-2 text-xs text-emerald-300">✨ {r.extras}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent offers */}
      <section className="container mx-auto px-6 py-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Recent quotes</div>
        {data.offers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">No quotes yet. Send them your requirement to get one!</div>
        ) : (
          <div className="grid gap-2">
            {data.offers.slice(0, 6).map(o => (
              <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm">
                  <span className="font-medium">{formatINR(o.price_inr)}</span>
                  <span className="text-muted-foreground text-xs ml-2">· {o.delivery_days === 0 ? 'Same-day' : `${o.delivery_days}d`} · {o.warranty}</span>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      {data.reviews.length > 0 && (
        <section className="container mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">What buyers say</div>
          <div className="grid md:grid-cols-2 gap-3">
            {data.reviews.slice(0, 4).map(r => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_,i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />)}
                </div>
                {r.title && <div className="font-medium text-sm">{r.title}</div>}
                {r.comment && <div className="text-sm text-muted-foreground mt-1">{r.comment}</div>}
                <div className="text-xs text-muted-foreground mt-2">— {r.buyer_name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-6 py-12">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.08] via-fuchsia-500/[0.06] to-orange-500/[0.06] p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Want a quote from {s.business_name.split(' ')[0]}?</h2>
          <p className="text-muted-foreground mt-2">Post your requirement on BoliBazzar and they&apos;ll compete for your order.</p>
          <Button className="mt-4 bg-gradient-to-br from-indigo-600 to-orange-500" onClick={onClose}>
            <Sparkles className="w-4 h-4 mr-2" />Ask BoliBazzar AI
          </Button>
        </div>
      </section>
    </div>
  );
}

// ============ STATIONERY (invoice / review-request / cashback emails) ============
function StationeryView({ user }) {
  const [tab, setTab] = useState('invoice');
  const sample = {
    order_id: 'BB-2025-1042',
    buyer_name: user?.name || 'Priya Sharma',
    buyer_email: user?.email || 'priya@test.com',
    product: 'iPhone 17 Pro Max 256GB Black',
    supplier: 'Croma - Andheri West',
    amount: 114400,
    delivery_date: 'Tomorrow, 5 Jun 2025',
    tracking: 'BB4A9F12',
    cashback: Math.round(114400 * 0.03),
    tier: 'Gold',
  };
  const templates = {
    invoice: {
      subject: `Your BoliBazzar order #${sample.order_id} is confirmed`,
      body: (
        <>
          <p>Namaste {sample.buyer_name.split(' ')[0]},</p>
          <p>Thank you for buying on BoliBazzar. Your order is confirmed and the supplier is preparing it for dispatch.</p>
          <div style={{ background: 'linear-gradient(135deg, rgba(67,56,202,0.06), rgba(249,115,22,0.06))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, margin: '18px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Order</div>
                <div style={{ fontWeight: 600 }}>{sample.order_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Total paid</div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{formatINR(sample.amount)}</div>
              </div>
            </div>
            <div style={{ margin: '14px 0', borderTop: '1px dashed rgba(0,0,0,0.1)' }} />
            <div>{sample.product}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Sold by {sample.supplier}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Delivery by {sample.delivery_date}</div>
          </div>
          <p style={{ fontSize: 14 }}>You&apos;ll receive updates on WhatsApp at every stage.</p>
        </>
      ),
      cta: { label: 'Track your order', color: '#4338ca' },
    },
    review: {
      subject: 'How was your experience with ' + sample.supplier + '?',
      body: (
        <>
          <p>Namaste {sample.buyer_name.split(' ')[0]},</p>
          <p>Your <b>{sample.product}</b> was delivered on {sample.delivery_date}. We hope you love it!</p>
          <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(249,115,22,0.06))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, margin: '18px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>Rate {sample.supplier}</div>
            <div style={{ fontSize: 28, letterSpacing: 6 }}>★ ★ ★ ★ ★</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>Your review helps 12,000+ other buyers</div>
          </div>
        </>
      ),
      cta: { label: 'Leave a review', color: '#e11d48' },
    },
    cashback: {
      subject: `+${formatINR(sample.cashback)} ${sample.tier} cashback added to your wallet`,
      body: (
        <>
          <p>Namaste {sample.buyer_name.split(' ')[0]},</p>
          <p>Delivery confirmed! We&apos;ve credited <b>{formatINR(sample.cashback)}</b> as {sample.tier} cashback into your BoliBazzar wallet.</p>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(6,182,212,0.06))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, margin: '18px 0' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Wallet balance</div>
            <div style={{ fontWeight: 700, fontSize: 26 }}>{formatINR((sample.cashback || 0) + 2400)}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>Use on any future order for instant discount.</div>
          </div>
        </>
      ),
      cta: { label: 'Open my wallet', color: '#10b981' },
    },
  };
  const active = templates[tab];
  return (
    <div className="container mx-auto px-6 py-12">
      <Badge variant="outline" className="mb-3"><Mail className="w-3 h-3 mr-1" />Brand stationery</Badge>
      <h1 className="text-4xl font-semibold">Emails that feel premium.</h1>
      <p className="text-muted-foreground mt-2">Every touchpoint styled with the BoliBazzar logo and colours — auto-sent at each key moment.</p>
      <div className="mt-6 flex gap-2 flex-wrap">
        {[['invoice','Order invoice'],['review','Review request'],['cashback','Cashback confirmation']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1.5 rounded-full text-sm border transition ${tab===k ? 'bg-gradient-to-r from-indigo-600 to-orange-500 border-0 text-white' : 'border-white/10 hover:border-white/20'}`}>{l}</button>
        ))}
      </div>
      {/* Email preview */}
      <div className="mt-6 rounded-2xl border border-white/10 overflow-hidden max-w-2xl">
        <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="text-muted-foreground text-xs">From <span className="text-foreground">hello@bolibazzar.in</span> · to {sample.buyer_email}</div>
            <div className="font-semibold mt-0.5">{active.subject}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={()=>{navigator.clipboard.writeText(active.subject);toast.success('Subject copied')}}><Copy className="w-3.5 h-3.5" /></Button>
        </div>
        <div className="bg-white text-slate-900 p-6" style={{color:'#0a0a12'}}>
          {/* Header with logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(0,0,0,0.06)', paddingBottom: 14, marginBottom: 18 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'linear-gradient(135deg,#4338ca,#e11d48,#f97316)', display:'grid', placeItems:'center' }}>
              <svg width="20" height="20" viewBox="0 0 64 64"><path d="M22 14 h12 a10 10 0 0 1 0 18 h-12 z M22 34 h16 a10 10 0 0 1 0 18 h-16 z" fill="#0a0a0f" transform="scale(0.85) translate(4 4)" /></svg>
            </div>
            <div style={{ fontWeight:700, fontSize:18 }}>
              <span style={{ color:'#0a0a12' }}>Boli</span>
              <span style={{ background:'linear-gradient(90deg,#e11d48,#f97316)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Bazzar</span>
            </div>
          </div>
          {active.body}
          <div style={{ marginTop: 22 }}>
            <a style={{ display:'inline-block', background:'linear-gradient(135deg,#4338ca,#f97316)', color:'white', padding:'12px 22px', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:14 }}>{active.cta.label} →</a>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>
            You Ask. Sellers Compete. You Win.<br/>© 2025 BoliBazzar Technologies · Made for Bharat
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ APP LANDING (desktop-first, download focused) ============
function AppLanding({ onSignIn, onSignUp }) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-orange-500/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-16 md:pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-6 px-4 py-1.5"><Sparkles className="w-3.5 h-3.5 mr-2 text-orange-400" />Now on iPhone and Android</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              <span className="text-foreground">You Ask.</span><br />
              <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Sellers Compete.</span><br />
              <span className="text-foreground">You Win.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              India&apos;s AI-powered reverse marketplace lives on your phone. Just speak or type what you want to buy — verified suppliers bid live, you pick the best offer, pay via UPI, and track till delivery.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap opacity-90">
              <a href="#" className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-5 py-3 hover:opacity-90 transition">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div className="text-left"><div className="text-[10px] opacity-70">Download on the</div><div className="font-semibold text-lg leading-tight">App Store</div></div>
              </a>
              <a href="#" className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-5 py-3 hover:opacity-90 transition">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5a1.5 1.5 0 011.5-1.5c.28 0 .55.08.78.22l13 7.5a1.5 1.5 0 010 2.6l-13 7.5A1.5 1.5 0 013 20.5z"/></svg>
                <div className="text-left"><div className="text-[10px] opacity-70">Get it on</div><div className="font-semibold text-lg leading-tight">Google Play</div></div>
              </a>
            </div>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Button size="lg" className="h-12 px-7 rounded-2xl bg-gradient-to-br from-indigo-600 to-orange-500 text-base" onClick={onSignUp}>
                Create an account
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 rounded-2xl border-white/20 text-base" onClick={onSignIn}>
                Sign in
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />4.8 ★ · 12k+ ratings</div>
              <span>·</span>
              <div className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-400" />UPI · GST-verified suppliers</div>
            </div>
          </div>
          {/* Phone mockup */}
          <div className="relative mx-auto md:ml-auto">
            <div className="relative w-[280px] md:w-[320px] h-[560px] md:h-[640px] rounded-[3rem] bg-gradient-to-br from-slate-800 to-slate-950 border-[6px] border-slate-800 shadow-2xl shadow-fuchsia-500/20 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-950 rounded-b-2xl z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-950 p-4 pt-10">
                <div className="flex items-center gap-2 mb-4">
                  <BoliBazzarLogo size={24} />
                  <div className="font-bold text-sm"><span className="text-foreground">Boli</span><span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span></div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 mb-3">
                  <div className="text-xs text-muted-foreground mb-1">✨ Ask AI what you want</div>
                  <div className="text-sm">iPhone 17 Pro Max 256GB Black under ₹1,20,000</div>
                </div>
                <div className="text-[10px] text-emerald-400 mb-2 flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />5 offers received</div>
                {[{n:'Croma - Andheri',p:1114400,d:'Same-day',b:true},{n:'Reliance Digital',p:1120900,d:'Next-day',b:false},{n:'Vijay Sales',p:1124800,d:'2 days',b:false}].map((o,i)=>(
                  <div key={i} className={`rounded-xl p-2.5 mb-2 border ${o.b?'border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 to-orange-500/5':'border-white/10 bg-white/[0.02]'}`}>
                    {o.b && <div className="text-[9px] text-fuchsia-300 mb-0.5">✨ AI PICK</div>}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[11px] font-medium">{o.n}</div>
                        <div className="text-[9px] text-muted-foreground">{o.d}</div>
                      </div>
                      <div className="font-bold text-sm">₹{(o.p/100000).toFixed(1)}L</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated walkthrough — the first thing a new visitor should see. */}
      <section className="border-y border-white/5 bg-white/[0.012]">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-orange-400" />See it work
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold">Watch a real auction happen</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Post what you want. Verified sellers bid against each other in a live
              window, and the price only moves one way.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <HowItWorksAnimation />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">Built for Bharat</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Everything shopping should be.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {i:Mic, t:'Voice + Regional', d:'Speak your requirement in English, Hindi, Tamil, Marathi or Bengali. AI understands all.'},
            {i:Bot, t:'AI Reverse Bidding', d:'Verified suppliers compete live. Watch prices drop in a 60-second bidding window.'},
            {i:CreditCard, t:'Secure UPI Checkout', d:'Razorpay-powered payments. UPI, cards, netbanking, all wallets. GST invoice for every order.'},
            {i:MessageSquare, t:'Chat & Negotiate', d:'Every offer has a chat. Ask questions, negotiate freebies, close the deal your way.'},
            {i:Truck, t:'Live Tracking', d:'Watch your order move on a live India map. WhatsApp updates at every stage.'},
            {i:Wallet, t:'Cashback + Tiers', d:'Earn 2-5% cashback based on your loyalty tier. Apply on any future order.'},
          ].map((f,i)=>(
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition p-6">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-orange-500/20 border border-white/10 grid place-items-center mb-4">
                <f.i className="w-5 h-5 text-fuchsia-300" />
              </div>
              <div className="font-semibold text-lg">{f.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Big CTA */}
      <section className="container mx-auto px-6 py-16">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.08] via-fuchsia-500/[0.06] to-orange-500/[0.08] p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-5xl font-bold">Ready to stop searching and start winning?</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Download BoliBazzar. Ask AI. Let suppliers compete for your business.</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <a href="#" className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-5 py-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              <div className="text-left"><div className="text-[10px] opacity-70">Download on the</div><div className="font-semibold text-lg leading-tight">App Store</div></div>
            </a>
            <a href="#" className="inline-flex items-center gap-3 rounded-2xl bg-foreground text-background px-5 py-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5a1.5 1.5 0 011.5-1.5c.28 0 .55.08.78.22l13 7.5a1.5 1.5 0 010 2.6l-13 7.5A1.5 1.5 0 013 20.5z"/></svg>
              <div className="text-left"><div className="text-[10px] opacity-70">Get it on</div><div className="font-semibold text-lg leading-tight">Google Play</div></div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  // Detect customer mode from URL: ?app, ?store=x, else landing.
  // Keep the first render identical on the server and client. Browser URL and
  // localStorage state is applied after hydration in the effect below.
  const [mode, setMode] = useState('landing');
  const [view, setView] = useState('home');
  const [storeSlug, setStoreSlug] = useState(null);
  const [showSplash, setShowSplash] = useState(false);
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState(null); // { mode: 'signin' | 'signup' } | null
  const [supplierSignupOpen, setSupplierSignupOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [requirement, setRequirement] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOffer, setChatOffer] = useState(null);
  const [payOffer, setPayOffer] = useState(null);
  const [reviewOffer, setReviewOffer] = useState(null);
  const [trackOffer, setTrackOffer] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tier, setTier] = useState(null);
  const [auction, setAuction] = useState(null);
  const [booting, setBooting] = useState(true);
  // Whether real gateway checkout is in play. In test environments payments
  // settle server-side, so the external Razorpay script is never needed —
  // and loading it would fail anyway on networks that block the CDN.
  const [liveCheckout, setLiveCheckout] = useState(false);

  // --- session ------------------------------------------------------------
  async function loadSession() {
    const s = await api('/auth/session');
    if (s.ok) {
      setUser(s.buyer || null);
      setTier(s.buyer?.tier || null);
    }
    setBooting(false);
  }
  async function loadWallet() {
    if (!user?.email) { setWallet(null); return; }
    const [w, m] = await Promise.all([api('/wallet'), api('/me')]);
    if (w.ok) setWallet(w.wallet);
    if (m.ok) setTier(m.user.tier);
  }
  useEffect(() => { loadSession(); }, []);
  useEffect(() => {
    api('/health').then((h) => {
      if (h.ok) setLiveCheckout(!!h.razorpay_live && !h.payments_test_mode);
    });
  }, []);
  useEffect(() => { loadWallet(); }, [user?.email]);

  async function logout() {
    await api('/auth/session', { method: 'DELETE', body: JSON.stringify({ role: 'buyer' }) });
    setUser(null); setWallet(null); setTier(null);
    setMode('landing');
    toast.success('Signed out');
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get('app') !== null ? 'app' : params.get('store') ? 'store' : 'landing';
    setMode(nextMode);
    setStoreSlug(params.get('store'));
    if (params.get('store')) setView('store');
    else if (params.get('view')) setView(params.get('view'));
    if (nextMode === 'landing' || nextMode === 'app') {
      try { setShowSplash(!localStorage.getItem('bb_splash_seen')); } catch { setShowSplash(true); }
    }
  }, []);

  // --- live auction polling ------------------------------------------------
  // One loop owns the board. It advances the auction server-side and pulls the
  // freshly ranked offers, so prices genuinely move while you watch.
  useEffect(() => {
    if (view !== 'offers' || !request?.id) return;
    let cancelled = false;
    let timer;

    async function poll() {
      const r = await api(`/requests/${request.id}/live`);
      if (cancelled) return;
      if (r.ok) {
        setOffers(r.offers || []);
        setAuction(r.auction);
        setRequest(prev => ({ ...prev, ...r.request }));
        setRefreshing(false);
        for (const drop of r.changes?.dropped || []) {
          toast.success(`Price dropped to ${formatINR(drop.new_price)}`, { id: 'drop-' + drop.id });
        }
      }
      // Poll fast while the auction is live, slowly once it has closed.
      const live = r.auction?.live && r.request?.status === 'open';
      timer = setTimeout(poll, live ? 2500 : 15000);
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [view, request?.id]);

  async function handleExtract(t) {
    setText(t); setLoading(true);
    const r = await post('/extract', { text: t });
    if (r.ok) {
      setRequirement(r.requirement);
      if (r.degraded) toast.warning('AI service unreachable — used the offline parser. Check the details.');
    } else {
      toast.error(r.error || 'Could not understand that requirement');
    }
    setLoading(false);
  }

  async function confirmRequirement() {
    setConfirming(true);
    const r = await post('/requests', { requirement, raw_text: text });
    if (r.ok) {
      if (!r.request.buyer_email) rememberGuestRequest(r.request.id);
      setRequest(r.request);
      setRequirement(null);
      setOffers([]);
      setAuction(null);
      setRefreshing(true);
      setView('offers');
    } else {
      toast.error(r.error || 'Could not post that request');
    }
    setConfirming(false);
  }

  function acceptOffer(offer) {
    if (!user) { setAuth({ mode: 'signin' }); toast.info('Sign in to complete your purchase'); return; }
    setPayOffer(offer);
  }

  async function onPaid(offer) {
    const accepted = await post(`/offers/${offer.id}/accept`);
    if (!accepted.ok) { toast.error(accepted.error || 'Could not confirm the order'); return; }
    const fresh = await api(`/requests/${request.id}/live`);
    if (fresh.ok) { setOffers(fresh.offers || []); setRequest(p => ({ ...p, ...fresh.request })); setAuction(fresh.auction); }
    loadWallet();
    setTimeout(() => setReviewOffer(offer), 1400);
  }

  async function openPastRequest(r) {
    const rr = await api(`/requests/${r.id}`);
    if (!rr.ok) return toast.error(rr.error || 'Could not open that request');
    setRequest(rr.request); setOffers(rr.offers || []); setAuction(null); setView('offers');
  }

  /** Send a freshly-authenticated account to its own side of the app. */
  function onAuthed(role, account) {
    if (role === 'supplier') {
      setMode('app');
      setView('supplier');
      return;
    }
    setUser(account);
    setTier(account?.tier || null);
    setMode('app');
    setView('home');
  }

  // ============ LANDING MODE (public) ============
  // Shown to every first-time visitor, exactly as on mobile.
  if (mode === 'landing') {
    return (
      <div>
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <button className="flex items-center gap-2">
              <BoliBazzarLogo size={34} />
              <div className="font-bold text-lg tracking-tight"><span className="text-foreground">Boli</span><span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Bazzar</span></div>
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button size="sm" variant="ghost" onClick={() => setAuth({ mode: 'signin' })}>Sign in</Button>
              <Button size="sm" className="bg-gradient-to-br from-indigo-600 to-orange-500" onClick={() => setAuth({ mode: 'signup' })}>
                Get started
              </Button>
            </div>
          </div>
        </header>
        <AppLanding
          onSignIn={() => setAuth({ mode: 'signin' })}
          onSignUp={() => setAuth({ mode: 'signup' })}
        />
        <Footer />
        <AuthModal
          open={!!auth}
          mode={auth?.mode || 'signin'}
          onOpenChange={(next) => setAuth(next && next.mode ? next : null)}
          onAuthed={onAuthed}
        />
      </div>
    );
  }

  // ============ APP MODE (PWA / mobile preview) ============
  return (
    <div>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      {liveCheckout && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      <Navbar
        view={view}
        setView={(v) => { setView(v); if (v === 'home') { setRequest(null); setOffers([]); setAuction(null); } }}
        user={user} booting={booting}
        onLogin={() => setAuth({ mode: 'signin' })} onLogout={logout}
        onSupplierSignup={() => setSupplierSignupOpen(true)}
        wallet={wallet} tier={tier}
      />

      {view === 'home' && !request && (<><Hero onSubmit={handleExtract} loading={loading} /><FeaturedElectronics /><HowItWorks /><FAQ /><Footer /></>)}
      {view === 'offers' && request && (<><OffersView request={request} offers={offers} auction={auction} onAccept={acceptOffer} onChat={setChatOffer} onTrack={setTrackOffer} refreshing={refreshing} user={user} /><Footer /></>)}
      {view === 'supplier' && (<><SupplierDashboard onSignup={() => setSupplierSignupOpen(true)} /><Footer /></>)}
      {view === 'my_requests' && user && (<><MyRequests user={user} onOpen={openPastRequest} /><Footer /></>)}
      {view === 'orders' && user && (<><OrdersView onTrack={setTrackOffer} onReview={setReviewOffer} /><Footer /></>)}
      {view === 'wallet' && user && (<><WalletView user={user} wallet={wallet} tier={tier} refresh={loadWallet} /><Footer /></>)}
      {view === 'stationery' && (<><StationeryView user={user} /><Footer /></>)}
      {view === 'store' && storeSlug && (<><BrandStore slug={storeSlug} onClose={() => { setStoreSlug(null); setView('home'); if (typeof window !== 'undefined') window.history.replaceState({}, '', '/'); }} /><Footer /></>)}

      {requirement && <RequirementPreview requirement={requirement} onConfirm={confirmRequirement} onCancel={() => setRequirement(null)} confirming={confirming} />}
      <AuthModal
        open={!!auth}
        mode={auth?.mode || 'signin'}
        onOpenChange={(next) => setAuth(next && next.mode ? next : null)}
        onAuthed={onAuthed}
      />
      <SupplierSignupModal open={supplierSignupOpen} onOpenChange={setSupplierSignupOpen} onDone={() => setView('supplier')} />
      {chatOffer && <ChatSheet offer={chatOffer} user={user} onClose={() => setChatOffer(null)} />}
      {payOffer && <PaymentModal offer={payOffer} user={user} wallet={wallet} tier={tier} onReloadWallet={loadWallet} onClose={() => setPayOffer(null)} onPaid={() => { onPaid(payOffer); setPayOffer(null); }} />}
      {reviewOffer && <ReviewModal offer={reviewOffer} user={user} onClose={() => setReviewOffer(null)} onSubmitted={() => setReviewOffer(null)} />}
      {trackOffer && <DeliveryTracker offer={trackOffer} onClose={() => setTrackOffer(null)} />}
    </div>
  );
}

export default App;
