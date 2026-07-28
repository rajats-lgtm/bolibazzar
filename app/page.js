'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import {
  Sparkles, Send, ShoppingBag, Store, ArrowRight, Check, Star, Truck, Shield, Clock,
  MapPin, TrendingDown, Package, MessageSquare, Loader2, ChevronRight, Award, Percent,
  Bell, Search, User, LogOut, CreditCard, CheckCircle2, X, FileCheck, Building2, ClipboardList,
  Mic, MicOff, Languages, Timer, BarChart3, Trophy, Zap, TrendingUp, Flame,
  Volume2, Wallet, Share2, Bot, Plus, Trash2, Power, Users, Crown
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
const api = (p, o) => fetch('/api' + p, o).then(r => r.json().then(j => ({ ok: r.ok, ...j })));

// ============ LOGIN MODAL (lightweight Google-style) ============
function LoginModal({ open, onOpenChange, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (!name.trim() || !email.trim()) return toast.error('Name and email required');
    setLoading(true);
    const r = await api('/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) });
    if (r.ok) { onLogin(r.user); onOpenChange(false); toast.success('Welcome, ' + r.user.name.split(' ')[0]); }
    else toast.error(r.error || 'Login failed');
    setLoading(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background/95 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl">Sign in to BoliBazaar</DialogTitle>
          <DialogDescription>Save your requests, chat with suppliers, and pay securely.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" className="w-full h-12 gap-3 border-white/20 bg-white/5 hover:bg-white/10" onClick={() => { setEmail('demo@bolibazaar.in'); setName('Demo Buyer'); setTimeout(submit, 100); }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google (demo)
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-white/10" /> or continue with email <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Full name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Rohan Kumar" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
          </div>
          <Button className="w-full" onClick={submit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ SUPPLIER SIGNUP MODAL ============
function SupplierSignupModal({ open, onOpenChange, onDone }) {
  const [f, setF] = useState({ business_name: '', gst: '', email: '', phone: '', city: 'Mumbai', pincode: '', address: '', supplier_type: 'retail_store', brand_authorisations: '' });
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (!f.business_name || !f.gst || !f.email) return toast.error('Business, GST, email required');
    setLoading(true);
    const r = await api('/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, brand_authorisations: f.brand_authorisations.split(',').map(s => s.trim()).filter(Boolean) }) });
    if (r.ok) {
      if (r.supplier.gst_valid) toast.success('Supplier verified & approved! You can now receive live requests.');
      else toast.warning('Submitted for manual review (GST format check failed).');
      onDone(r.supplier);
      onOpenChange(false);
    } else toast.error(r.error);
    setLoading(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background/95 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl"><Building2 className="w-5 h-5 text-fuchsia-400" />Become a verified supplier</DialogTitle>
          <DialogDescription>Get live buyer requests from across India. Verification is instant with a valid GSTIN.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Business name *</label>
            <Input value={f.business_name} onChange={e => setF({...f, business_name: e.target.value})} placeholder="Croma Retail Pvt Ltd" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">GSTIN * (15 chars)</label>
            <Input value={f.gst} onChange={e => setF({...f, gst: e.target.value.toUpperCase()})} placeholder="27AAECI1681G1ZP" maxLength={15} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email *</label>
            <Input value={f.email} onChange={e => setF({...f, email: e.target.value})} type="email" placeholder="store@brand.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="+91 98xxxxxxxx" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">City</label>
            <Input value={f.city} onChange={e => setF({...f, city: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pincode</label>
            <Input value={f.pincode} onChange={e => setF({...f, pincode: e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Store address</label>
            <Input value={f.address} onChange={e => setF({...f, address: e.target.value})} placeholder="Shop 12, Phoenix Marketcity" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Supplier type</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {[['retail_store','Retail store'],['brand_store','Brand store'],['authorised_reseller','Authorised reseller'],['wholesaler','Wholesaler']].map(([v,l]) => (
                <button key={v} onClick={() => setF({...f, supplier_type: v})} className={`px-3 py-1.5 rounded-full text-xs border transition ${f.supplier_type === v ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200' : 'border-white/10 hover:border-white/20'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Brand authorisations (comma separated)</label>
            <Input value={f.brand_authorisations} onChange={e => setF({...f, brand_authorisations: e.target.value})} placeholder="Apple, Samsung, Sony, Dell" />
          </div>
        </div>
        <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-br from-fuchsia-500 to-violet-600 mt-2">
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
    await api(`/messages/${offer.id}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: 'buyer' }) });
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
    const r = await api('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_id: offer.id, sender: 'buyer', sender_name: user?.name || 'Buyer', text }) });
    if (r.ok) {
      setMessages(prev => [...prev, r.message]);
      sinceRef.current = r.message.created_at;
      setText('');
      // Auto-reply from supplier for demo aha
      setTimeout(async () => {
        const replies = [
          `Sure, we can do that. Available at our store today.`,
          `Let me check with my manager and get back within 10 minutes.`,
          `Yes, delivery is possible. Confirm your address please.`,
          `That price includes GST. Free case + tempered glass included.`,
          `Can offer additional ₹500 off if you confirm in next 2 hours!`,
        ];
        await api('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_id: offer.id, sender: 'supplier', sender_name: offer.supplier_name, text: replies[Math.floor(Math.random()*replies.length)] }) });
      }, 2200 + Math.random() * 2000);
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
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white' : 'bg-white/5 border border-white/10'}`}>
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

// ============ PAYMENT MODAL ============
function PaymentModal({ offer, user, wallet, tier, onClose, onPaid, onReloadWallet }) {
  const [step, setStep] = useState('review');
  const [creating, setCreating] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const walletBal = wallet?.balance_inr || 0;
  const walletApply = useWallet ? Math.min(walletBal, Math.max(0, offer.price_inr - 1)) : 0;
  const finalAmount = offer.price_inr - walletApply;

  async function pay() {
    setCreating(true);
    const r = await api('/payments/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_id: offer.id, amount_inr: offer.price_inr, buyer_email: user?.email || null, wallet_apply_inr: walletApply }) });
    if (!r.ok) { toast.error(r.error || 'Order creation failed'); setCreating(false); return; }
    if (r.mocked || !r.key_id) {
      setStep('processing');
      setTimeout(async () => {
        const v = await api('/payments/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: r.order_id, razorpay_payment_id: 'pay_mock_' + Date.now(), razorpay_signature: 'mock' }) });
        if (v.ok) { setStep('success'); onPaid(); onReloadWallet?.(); } else setStep('fail');
      }, 1600);
      setCreating(false); return;
    }
    if (!window.Razorpay) { toast.error('Razorpay script not loaded'); setCreating(false); return; }
    const options = {
      key: r.key_id, amount: r.amount, currency: r.currency, order_id: r.order_id,
      name: 'BoliBazaar', description: `${offer.supplier_name} · ${formatINR(offer.price_inr)}`,
      prefill: { name: user?.name || 'Buyer', email: user?.email || '' },
      theme: { color: '#a21caf' },
      handler: async (resp) => {
        setStep('processing');
        const v = await api('/payments/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
        if (v.ok) { setStep('success'); onPaid(); onReloadWallet?.(); } else setStep('fail');
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => setStep('fail'));
    rzp.open(); setCreating(false);
  }

  function shareOnWhatsApp() {
    const text = `\u{1F389} Just got an amazing deal on BoliBazaar!\n\n${offer.supplier_name}: ${formatINR(offer.price_inr)}\nDelivery: ${offer.delivery_note}\n${offer.extras ? '\u2728 ' + offer.extras + '\n' : ''}\nTry BoliBazaar - India's AI reverse marketplace where suppliers compete for YOUR business:\n${typeof window !== 'undefined' ? window.location.origin : ''}`;
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
                  <div className="text-sm font-medium">Use BoliBazaar wallet</div>
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
          <Button onClick={pay} disabled={creating} className="w-full mt-2 bg-gradient-to-br from-fuchsia-500 to-violet-600 h-11">
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
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 grid place-items-center mx-auto"><Check className="w-8 h-8 text-emerald-400" /></div>
            <div className="mt-4 text-xl font-semibold">Payment successful 🎉</div>
            <div className="text-sm text-muted-foreground">Order with {offer.supplier_name} confirmed. Delivery in {offer.delivery_days === 0 ? 'a few hours' : `${offer.delivery_days} day(s)`}.</div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <Wallet className="w-3 h-3" />+{formatINR(Math.round(offer.price_inr * ((tier?.cashback_pct || 2) / 100)))} {tier?.label || 'Silver'} cashback added to wallet
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" onClick={shareOnWhatsApp}>
                <Share2 className="w-4 h-4 mr-2" />Share deal
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
        {step === 'fail' && (
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 grid place-items-center mx-auto"><X className="w-8 h-8 text-red-400" /></div>
            <div className="mt-4 text-xl font-semibold">Payment failed</div>
            <Button className="mt-6 w-full" onClick={() => setStep('review')}>Try again</Button>
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
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-blue-500/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/10 blur-3xl" />
      </div>
      <div className="container mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
        <Badge variant="outline" className="mb-6 px-4 py-1.5 border-white/20 bg-white/5 backdrop-blur text-sm">
          <Sparkles className="w-3.5 h-3.5 mr-2 text-fuchsia-400" />India&apos;s first AI Reverse Marketplace
        </Badge>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Tell us what you want to buy.<br />
          <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Sellers compete for your business.</span>
        </motion.h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          No endless scrolling. Speak or type in <span className="text-foreground">English, Hindi, Tamil, Marathi</span> — our AI understands and verified suppliers bid live.
        </p>
        <div className="mt-10 max-w-3xl mx-auto">
          <div className="group relative rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl shadow-fuchsia-500/5 p-2">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-fuchsia-500/40 via-violet-500/30 to-cyan-500/40 opacity-0 group-focus-within:opacity-100 transition -z-10 blur-md" />
            <div className="flex items-start gap-2 p-3">
              <div className="pt-2.5 pl-1 text-fuchsia-400"><Sparkles className="w-5 h-5" /></div>
              <Textarea value={interim ? text + (text ? ' ' : '') + interim : text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSubmit(text); } }} placeholder="What would you like to buy today? e.g. iPhone 17 Pro Max 256GB Black under ₹1,20,000..." className="min-h-[64px] resize-none border-0 bg-transparent text-base md:text-lg focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60" />
              <div className="flex flex-col gap-2">
                <Button onClick={toggleListen} size="lg" variant={listening ? 'default' : 'outline'} className={`h-12 w-12 rounded-2xl p-0 ${listening ? 'bg-red-500 hover:bg-red-600 border-0 animate-pulse' : 'border-white/20 bg-white/5'}`} title={listening ? 'Stop listening' : 'Voice search'}>
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button onClick={() => text.trim() && onSubmit(text)} disabled={loading || !text.trim()} size="lg" className="h-12 px-5 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:opacity-90 text-white shadow-lg shadow-fuchsia-500/20">
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
          <Button onClick={onConfirm} disabled={confirming} className="bg-gradient-to-br from-fuchsia-500 to-violet-600">
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
      {showAiPick && <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-fuchsia-500 to-violet-600 border-0"><Sparkles className="w-3 h-3 mr-1" />AI Pick · Best value</Badge>}
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
        <Button size="sm" disabled={offer.status === 'accepted' || offer.status === 'rejected'} onClick={() => onAccept(offer)} className={showAiPick ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600' : ''}>
          {offer.status === 'accepted' ? <><Check className="w-4 h-4 mr-2" />Accepted</> : offer.status === 'rejected' ? 'Closed' : <>Accept & Pay<ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </motion.div>
  );
}

// ============ BIDDING COUNTDOWN ============
function BiddingCountdown({ requestId, onTick, onDone }) {
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (seconds <= 0) { onDone(); return; }
    // tick api every ~12s (drops prices)
    if (seconds === 60 || seconds === 48 || seconds === 36 || seconds === 24 || seconds === 12) {
      api(`/requests/${requestId}/tick`, { method: 'POST' }).then(r => { if (r.ok) onTick(r); });
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, requestId]);
  const pct = (seconds / 60) * 100;
  const hot = seconds < 15;
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
function SupplierAnalytics({ email }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputEmail, setInputEmail] = useState(email || 'test@apple.in');
  const [q, setQ] = useState(email || 'test@apple.in');

  useEffect(() => { (async () => { setLoading(true); const r = await api(`/analytics/supplier/${encodeURIComponent(q)}`); setData(r); setLoading(false); })(); }, [q]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-fuchsia-400" />
          <div>
            <div className="font-semibold">Your analytics</div>
            <div className="text-xs text-muted-foreground">Real-time supplier performance</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={inputEmail} onChange={e => setInputEmail(e.target.value)} placeholder="your supplier email" className="w-56 h-9" />
          <Button size="sm" onClick={() => setQ(inputEmail)}>View</Button>
        </div>
      </div>
      {loading ? <div className="text-muted-foreground text-sm">Loading...</div> : data && (
        <>
          {data.supplier ? (
            <div className="mb-4 text-sm text-muted-foreground">Analytics for <span className="text-foreground font-medium">{data.supplier.business_name}</span> · GST {data.supplier.gst_valid ? 'verified' : 'pending'}</div>
          ) : (
            <div className="mb-4 text-sm text-muted-foreground">No supplier registered for this email yet. Register above to start receiving requests.</div>
          )}
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

function OffersView({ request, offers, onAccept, onChat, onTrack, refreshing, onTick, user }) {
  const [bidClosed, setBidClosed] = useState(request?.status === 'closed');
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

      {!bidClosed && offers.length > 0 && request.status !== 'closed' && (
        <BiddingCountdown requestId={request.id} onTick={(r) => onTick(r.offers)} onDone={() => setBidClosed(true)} />
      )}
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
  const q = [{q:'How is this different from Amazon or Flipkart?',a:"On BoliBazaar you don't search. Describe what you want, verified suppliers compete to sell it at the best price."},{q:'Is it free for buyers?',a:'Yes. Buyers pay zero platform fees. Suppliers pay a small commission on completed orders only.'},{q:'Are suppliers verified?',a:'Every supplier goes through GST, business, address and brand authorisation checks before joining.'},{q:'Can I negotiate?',a:'Yes — every offer has a built-in chat with the supplier.'},{q:'Which categories are live?',a:'Electronics is live now. Furniture, Cars, Bikes, Home Services and more coming.'}];
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
function Footer() { return (<footer className="border-t border-white/10 mt-16"><div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center"><Sparkles className="w-4 h-4" /></div><div className="font-semibold">BoliBazaar</div><span className="text-muted-foreground text-sm">· India\'s AI Reverse Marketplace</span></div><div className="text-xs text-muted-foreground">© 2025 BoliBazaar Technologies · Made for Bharat</div></div></footer>); }

function Navbar({ view, setView, user, onLogin, onLogout, onSupplierSignup, wallet, tier }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/5">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => setView('home')} className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/30"><Sparkles className="w-4 h-4" /></div><div className="font-semibold text-lg tracking-tight">BoliBazaar</div></button>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant={view === 'home' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('home')}><ShoppingBag className="w-4 h-4 mr-2" />Buy</Button>
          {user && <Button variant={view === 'my_requests' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('my_requests')}><ClipboardList className="w-4 h-4 mr-2" />My requests</Button>}
          <Button variant={view === 'supplier' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('supplier')}><Store className="w-4 h-4 mr-2" />Supplier</Button>
        </nav>
        <div className="flex items-center gap-2">
          {user && wallet && wallet.balance_inr > 0 && (
            <button onClick={() => setView('wallet')} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm hover:bg-emerald-500/20 transition">
              <Wallet className="w-4 h-4" />{formatINR(wallet.balance_inr)}
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={onSupplierSignup} className="hidden md:inline-flex"><Building2 className="w-4 h-4 mr-2" />Sell on BoliBazaar</Button>
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
                <DropdownMenuItem onClick={() => setView('wallet')}><Wallet className="w-4 h-4 mr-2" />Wallet <span className="ml-auto text-xs text-emerald-400">{formatINR(wallet?.balance_inr || 0)}</span></DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}><LogOut className="w-4 h-4 mr-2" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={onLogin} className="bg-white text-black hover:bg-white/90">Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MyRequests({ user, onOpen }) {
  const [reqs, setReqs] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const r = await api(`/me/${encodeURIComponent(user.email)}`); setReqs(r.requests || []); setLoading(false); })(); }, [user.email]);
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

function SupplierDashboard({ onSignup, user }) {
  const [requests, setRequests] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ supplier_name: 'Croma - Andheri', price_inr: '', delivery_days: '2', delivery_note: 'Next-day delivery', warranty: '1 year manufacturer', rating: '4.6', reviews: '1200', validity_hours: '24', extras: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  async function load() { setLoading(true); const r = await api('/requests'); setRequests(r.requests || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function submitOffer() { if (!selected) return; setSubmitting(true); const r = await api(`/requests/${selected.id}/offers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (r.ok) { toast.success('Offer sent to buyer'); setSelected(null); } else toast.error('Failed'); setSubmitting(false); }
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div><Badge variant="outline" className="mb-3"><Store className="w-3 h-3 mr-1" />Supplier dashboard</Badge><h1 className="text-4xl font-semibold">Incoming buyer requests</h1><p className="text-muted-foreground mt-2">Live requirements from verified buyers. Submit your best offer to win.</p></div>
        <Button onClick={onSignup} variant="outline" className="border-fuchsia-500/40"><Building2 className="w-4 h-4 mr-2" />Register your business</Button>
      </div>

      <SupplierAnalytics email={user?.email} />
      <AutoBidRulesPanel email={user?.email} />

      {loading && <div className="text-muted-foreground">Loading...</div>}
      <div className="grid gap-3">
        {requests.map(r => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className={`h-2 w-2 rounded-full ${r.status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />{r.status.toUpperCase()} · {new Date(r.created_at).toLocaleString('en-IN')}</div>
                <div className="text-lg font-semibold mt-1">{r.requirement.summary || r.requirement.product}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.requirement.brand && <Badge variant="outline">{r.requirement.brand}</Badge>}
                  {r.requirement.model && <Badge variant="outline">{r.requirement.model}</Badge>}
                  {r.requirement.storage && <Badge variant="outline">{r.requirement.storage}</Badge>}
                  {r.requirement.budget_inr && <Badge variant="outline">Budget {formatINR(r.requirement.budget_inr)}</Badge>}
                  {r.requirement.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{r.requirement.location}</Badge>}
                  <Badge variant="outline">Qty {r.requirement.quantity}</Badge>
                </div>
              </div>
              <Button onClick={() => { setSelected(r); setForm(f => ({ ...f, price_inr: r.requirement.budget_inr ? String(Math.round(r.requirement.budget_inr * 0.95)) : '' })); }} disabled={r.status !== 'open'}>Submit offer<ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        ))}
        {!loading && !requests.length && <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-muted-foreground">No requests yet.</div>}
      </div>
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg bg-background/95 border-white/10">
          <DialogHeader><DialogTitle>Submit your offer</DialogTitle><DialogDescription>{selected?.requirement?.summary}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Store name</label><Input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} /></div>
            <div><label className="text-xs text-muted-foreground">Price (₹)</label><Input type="number" value={form.price_inr} onChange={e => setForm({...form, price_inr: e.target.value})} /></div>
            <div><label className="text-xs text-muted-foreground">Delivery days</label><Input type="number" value={form.delivery_days} onChange={e => setForm({...form, delivery_days: e.target.value})} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Delivery note</label><Input value={form.delivery_note} onChange={e => setForm({...form, delivery_note: e.target.value})} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Warranty</label><Input value={form.warranty} onChange={e => setForm({...form, warranty: e.target.value})} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Extras</label><Input value={form.extras} onChange={e => setForm({...form, extras: e.target.value})} placeholder="Free case + HDFC 10% off" /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Message to buyer</label><Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button onClick={submitOffer} disabled={submitting || !form.price_inr}>{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Send offer</Button></div>
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
    const r = await api('/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer_id: offer.id, rating, title, comment, tags, buyer_name: user?.name || 'Buyer', buyer_email: user?.email || null }) });
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
        <Button onClick={submit} disabled={saving} className="w-full bg-gradient-to-br from-fuchsia-500 to-violet-600">
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
        <h1 className="text-4xl font-semibold">BoliBazaar wallet</h1>
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
function AutoBidRulesPanel({ email }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [emailInput, setEmailInput] = useState(email || 'test@apple.in');
  const [active, setActive] = useState(email || 'test@apple.in');
  const [f, setF] = useState({ name: 'Apple smartphones auto-bid', brand: 'Apple', sub_category: 'smartphone', discount_pct: '5', delivery_days: '1', warranty: '1 year manufacturer', extras: 'Free case', validity_hours: '24', message: 'Ready to dispatch today!' });
  async function load() { setLoading(true); const r = await api(`/supplier/rules/${encodeURIComponent(active)}`); setRules(r.rules || []); setLoading(false); }
  useEffect(() => { load(); }, [active]);
  async function create() {
    setCreating(true);
    const r = await api('/supplier/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_email: active, ...f }) });
    if (r.ok) { toast.success('Auto-bid rule live! You will auto-offer on matching requests.'); load(); }
    else toast.error(r.error || 'Failed. Make sure supplier is registered.');
    setCreating(false);
  }
  async function toggle(id) { await api(`/supplier/rules/id/${id}/toggle`, { method: 'POST' }); load(); }
  async function del(id) { await api(`/supplier/rules/id/${id}`, { method: 'DELETE' }); load(); toast.success('Rule deleted'); }
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
        <div className="flex items-center gap-2">
          <Input value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your supplier email" className="w-56 h-9" />
          <Button size="sm" variant="outline" onClick={() => setActive(emailInput)}>Load</Button>
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
                <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
        <Button size="sm" onClick={create} disabled={creating} className="mt-3 bg-gradient-to-br from-fuchsia-500 to-violet-600">
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
      const r = await api(`/groups/${g.id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyer_email: user.email, buyer_name: user.name }) });
      if (r.ok) { toast.success('Joined group buy! Deeper discounts unlocking...'); setSuggestion({ ...suggestion, existing_group: r.group }); }
    } else {
      const r = await api(`/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: request.id, buyer_email: user.email, buyer_name: user.name }) });
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

// ============ MAIN APP ============
function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
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

  async function loadWallet() {
    if (!user?.email) { setWallet(null); setTier(null); return; }
    const [w, m] = await Promise.all([
      api(`/wallet/${encodeURIComponent(user.email)}`),
      api(`/me/${encodeURIComponent(user.email)}`),
    ]);
    if (w.ok) setWallet(w.wallet);
    if (m.ok) setTier(m.user.tier);
  }
  useEffect(() => { loadWallet(); }, [user?.email]);

  useEffect(() => { const s = localStorage.getItem('bb_user'); if (s) try { setUser(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { user ? localStorage.setItem('bb_user', JSON.stringify(user)) : localStorage.removeItem('bb_user'); }, [user]);

  async function handleExtract(t) {
    setText(t); setLoading(true);
    const r = await api('/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) });
    if (r.ok) setRequirement(r.requirement); else toast.error(r.error || 'AI failed');
    setLoading(false);
  }
  async function confirmRequirement() {
    setConfirming(true);
    const r = await api('/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requirement, raw_text: text, buyer_name: user?.name || 'Guest', buyer_email: user?.email || null }) });
    if (r.ok) {
      setRequest(r.request); setRequirement(null); setView('offers'); setOffers([]); setRefreshing(true);
      const sim = await api(`/requests/${r.request.id}/simulate`, { method: 'POST' });
      if (sim.ok && sim.offers) {
        const sorted = [...sim.offers].sort((a,b) => a.price_inr - b.price_inr);
        for (let i = 0; i < sorted.length; i++) {
          await new Promise(res => setTimeout(res, 600 + Math.random()*700));
          setOffers(prev => [...prev, sorted[i]].sort((a,b) => a.price_inr - b.price_inr));
        }
      }
      setRefreshing(false);
    } else toast.error(r.error);
    setConfirming(false);
  }
  function acceptOffer(offer) { setPayOffer(offer); }
  async function onPaid() {
    await api(`/offers/${payOffer.id}/accept`, { method: 'POST' });
    const rr = await api(`/requests/${request.id}`);
    setOffers(rr.offers || []); setRequest(rr.request);
    // Prompt buyer to review after 1s
    setTimeout(() => setReviewOffer(payOffer), 1200);
  }
  async function openPastRequest(r) {
    const rr = await api(`/requests/${r.id}`);
    setRequest(rr.request); setOffers(rr.offers || []); setView('offers');
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Navbar view={view} setView={(v) => { setView(v); if (v === 'home') { setRequest(null); setOffers([]); } }} user={user} onLogin={() => setLoginOpen(true)} onLogout={() => setUser(null)} onSupplierSignup={() => setSupplierSignupOpen(true)} wallet={wallet} tier={tier} />

      {view === 'home' && !request && (<><Hero onSubmit={handleExtract} loading={loading} /><FeaturedElectronics /><HowItWorks /><FAQ /><Footer /></>)}
      {view === 'offers' && request && (<><OffersView request={request} offers={offers} onAccept={acceptOffer} onChat={setChatOffer} onTrack={setTrackOffer} refreshing={refreshing} onTick={(newOffers) => setOffers(newOffers)} user={user} /><Footer /></>)}
      {view === 'supplier' && (<><SupplierDashboard onSignup={() => setSupplierSignupOpen(true)} user={user} /><Footer /></>)}
      {view === 'my_requests' && user && (<><MyRequests user={user} onOpen={openPastRequest} /><Footer /></>)}
      {view === 'wallet' && user && (<><WalletView user={user} wallet={wallet} tier={tier} refresh={loadWallet} /><Footer /></>)}

      {requirement && <RequirementPreview requirement={requirement} onConfirm={confirmRequirement} onCancel={() => setRequirement(null)} confirming={confirming} />}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onLogin={setUser} />
      <SupplierSignupModal open={supplierSignupOpen} onOpenChange={setSupplierSignupOpen} onDone={() => {}} />
      {chatOffer && <ChatSheet offer={chatOffer} user={user} onClose={() => setChatOffer(null)} />}
      {payOffer && <PaymentModal offer={payOffer} user={user} wallet={wallet} tier={tier} onReloadWallet={loadWallet} onClose={() => setPayOffer(null)} onPaid={() => { onPaid(); setPayOffer(null); }} />}
      {reviewOffer && <ReviewModal offer={reviewOffer} user={user} onClose={() => setReviewOffer(null)} onSubmitted={() => setReviewOffer(null)} />}
      {trackOffer && <DeliveryTracker offer={trackOffer} onClose={() => setTrackOffer(null)} />}
    </div>
  );
}

export default App;
