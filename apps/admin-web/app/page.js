'use client';

import { useEffect, useState } from 'react';

const tabs = [
  ['overview', 'Overview'], ['customers', 'Customers'], ['suppliers', 'Suppliers'],
  ['requests', 'Requests'], ['offers', 'Offers'], ['payments', 'Payments'],
  ['reviews', 'Reviews'], ['messages', 'Messages'], ['audit', 'Audit'], ['settings', 'Settings'],
];
const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const date = (value) => value ? new Date(value).toLocaleString('en-IN') : '-';

export default function AdminPortal() {
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ email: '', access_key: '' });
  const [tab, setTab] = useState('overview');
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [audit, setAudit] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [settings, setSettings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadSession() {
    const response = await fetch('/api/admin/session');
    const auth = await response.json();
    if (auth.authenticated) setSession(auth.email);
    setLoading(false);
  }
  async function loadTab(nextTab = tab) {
    setError('');
    if (nextTab === 'overview') {
      const response = await fetch('/api/admin/overview');
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Could not load overview');
      setMetrics(data.metrics || {}); setRecords(data.requests || []); return;
    }
    if (nextTab === 'audit') {
      const response = await fetch('/api/admin/audit'); const data = await response.json();
      if (!response.ok) return setError(data.error || 'Could not load audit trail');
      setAudit(data.audit || []); return;
    }
    if (nextTab === 'settings') {
      const response = await fetch('/api/admin/records?type=settings'); const data = await response.json();
      if (!response.ok) return setError(data.error || 'Could not load settings');
      setSettings(data.records || []); return;
    }
    const params = new URLSearchParams({ type: nextTab, limit: '250' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/records?${params}`); const data = await response.json();
    if (!response.ok) return setError(data.error || 'Could not load records');
    setRecords(data.records || []);
  }
  useEffect(() => { loadSession(); }, []);
  useEffect(() => { if (session) loadTab(tab); }, [session, tab]);

  async function login(event) {
    event.preventDefault(); setError('');
    const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Access denied');
    setForm({ email: '', access_key: '' }); setSession(data.email);
  }
  async function logout() { await fetch('/api/admin/session', { method: 'DELETE' }); setSession(null); }
  async function mutate(url, body) {
    const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Operation failed'); return false; }
    await loadTab(tab); return true;
  }
  function reason(label) { return window.prompt(`${label} reason (optional)`) || ''; }
  async function customerAction(record) {
    const next = record.status === 'suspended' ? 'active' : 'suspended';
    await mutate(`/api/admin/customers/${encodeURIComponent(record.email)}/status`, { status: next, reason: reason('Customer status') });
  }
  async function walletAction(record) {
    const amount = window.prompt('Wallet adjustment in INR. Use a negative value to debit.');
    if (amount) await mutate(`/api/admin/customers/${encodeURIComponent(record.email)}/wallet`, { amount_inr: Number(amount), reason: reason('Wallet adjustment') });
  }
  async function statusAction(type, id, current) {
    const next = window.prompt(`New ${type} status`, current || 'approved');
    if (!next) return;
    const path = type === 'supplier' ? 'suppliers' : type === 'request' ? 'requests' : 'offers';
    await mutate(`/api/admin/${path}/${encodeURIComponent(id)}/status`, { status: next, reason: reason(`${type} status`) });
  }
  async function paymentAction(record) {
    const next = window.prompt('Payment review status', record.review_status || 'reconciled');
    if (next) await mutate(`/api/admin/payments/${record.id}/review`, { review_status: next, note: reason('Payment review') });
  }
  async function reviewAction(record) {
    const next = record.visibility === 'hidden' ? 'visible' : 'hidden';
    await mutate(`/api/admin/reviews/${record.id}/visibility`, { visibility: next, reason: reason('Review moderation') });
  }
  async function saveSetting() {
    const key = window.prompt('Setting key, for example bidding_window_seconds');
    if (!key) return;
    const value = window.prompt('Setting value');
    if (value == null) return;
    await mutate('/api/admin/settings', { key, value });
    loadTab('settings');
  }

  if (loading) return <main className="min-h-screen bg-[#080b12] text-slate-200 grid place-items-center">Loading secure console...</main>;
  if (!session) return <main className="min-h-screen bg-[#080b12] text-slate-200 grid place-items-center px-6"><form onSubmit={login} className="w-full max-w-md border border-slate-700 bg-[#101722] p-8 shadow-2xl"><div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Restricted operations</div><h1 className="mt-3 text-3xl font-semibold">CEO control room</h1><p className="mt-2 text-sm text-slate-400">Private BoliBazzar administration. Every action is logged.</p><label className="mt-8 block text-sm text-slate-300">CEO email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full border border-slate-600 bg-[#080b12] px-3 py-3 outline-none focus:border-cyan-400" /></label><label className="mt-4 block text-sm text-slate-300">Access key<input required type="password" value={form.access_key} onChange={(event) => setForm({ ...form, access_key: event.target.value })} className="mt-2 w-full border border-slate-600 bg-[#080b12] px-3 py-3 outline-none focus:border-cyan-400" /></label>{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}<button className="mt-6 w-full bg-cyan-400 px-4 py-3 font-semibold text-slate-950">Enter secure console</button></form></main>;

  return <main className="min-h-screen bg-[#080b12] text-slate-200"><header className="border-b border-slate-800 bg-[#0d131d] px-8 py-5 flex items-center justify-between"><div><div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Private operations</div><h1 className="mt-1 text-2xl font-semibold">CEO control room</h1><p className="text-xs text-slate-500">Signed in as {session}</p></div><button onClick={logout} className="border border-slate-700 px-4 py-2 text-sm text-slate-300">Lock console</button></header><div className="mx-auto max-w-[1500px] px-8 py-6"><nav className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px">{tabs.map(([key, label]) => <button key={key} onClick={() => { setTab(key); setSearch(''); setStatus(''); }} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${tab === key ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>{label}</button>)}</nav>{error && <div className="mt-4 border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}{tab === 'overview' && <Overview metrics={metrics} records={records} />}{tab === 'audit' && <Audit records={audit} />}{tab === 'settings' && <Settings records={settings} onAdd={saveSetting} />}{!['overview', 'audit', 'settings'].includes(tab) && <Records type={tab} records={records} search={search} status={status} setSearch={setSearch} setStatus={setStatus} reload={() => loadTab(tab)} onCustomer={customerAction} onWallet={walletAction} onStatus={statusAction} onPayment={paymentAction} onReview={reviewAction} />}</div></main>;
}

function Panel({ title, children, action }) { return <section className="border border-slate-800 bg-[#101722] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>{action}</div>{children}</section>; }
function Overview({ metrics, records }) { return <div className="mt-6 space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Requests', metrics.request_count], ['Offers', metrics.offer_count], ['Pending', metrics.pending_offers], ['Paid orders', metrics.paid_orders], ['Payment volume', money(metrics.payment_volume_inr)]].map(([label, value]) => <div key={label} className="border border-slate-800 bg-[#101722] p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-cyan-300">{value || 0}</div></div>)}</div><Panel title="Request watchlist"><Table headers={['Request', 'Buyer', 'Offers', 'Status', 'Budget']} rows={records.slice(0, 12).map((record) => [record.requirement?.summary || record.requirement?.product || '-', record.buyer_email || 'guest', record.offer_count || 0, record.status, money(record.requirement?.budget_inr)])} /></Panel></div>; }
function Audit({ records }) { return <Panel title="Immutable operational audit trail"><Table headers={['Action', 'Actor', 'Details', 'Time']} rows={records.map((record) => [record.action, record.actor_email || 'system', JSON.stringify(record.details || {}), date(record.created_at)])} /></Panel>; }
function Settings({ records, onAdd }) { return <Panel title="Non-secret platform settings" action={<button onClick={onAdd} className="bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Add setting</button>}><Table headers={['Key', 'Value', 'Updated by', 'Updated']} rows={records.map((record) => [record.key, String(record.value), record.updated_by || '-', date(record.updated_at)])} /></Panel>; }
function Records({ type, records, search, status, setSearch, setStatus, reload, onCustomer, onWallet, onStatus, onPayment, onReview }) { const statuses = type === 'suppliers' ? ['pending_review', 'approved', 'rejected', 'suspended'] : type === 'requests' ? ['open', 'closed', 'cancelled', 'escalated'] : type === 'payments' ? ['created', 'paid', 'failed'] : []; const headers = type === 'customers' ? ['Name', 'Email', 'Status', 'Last login', 'Actions'] : type === 'suppliers' ? ['Business', 'Email', 'City', 'Status', 'Actions'] : type === 'requests' ? ['Buyer', 'Product', 'Budget', 'Status', 'Actions'] : type === 'offers' ? ['Supplier', 'Price', 'Source', 'Status', 'Actions'] : type === 'payments' ? ['Buyer', 'Amount', 'Payment status', 'Review', 'Actions'] : type === 'reviews' ? ['Supplier', 'Rating', 'Comment', 'Visibility', 'Actions'] : type === 'messages' ? ['Sender', 'Offer', 'Message', 'Created'] : ['Record']; const rows = records.map((record) => { if (type === 'customers') return [record.name || '-', record.email, record.status || 'active', date(record.last_login), <Actions key={record.email}><button onClick={() => onCustomer(record)}>Suspend/restore</button><button onClick={() => onWallet(record)}>Wallet adjust</button></Actions>]; if (type === 'suppliers') return [record.business_name, record.email, record.city || '-', record.status, <Actions key={record.id}><button onClick={() => onStatus('supplier', record.id, record.status)}>Change status</button></Actions>]; if (type === 'requests') return [record.buyer_email || 'guest', record.requirement?.summary || record.requirement?.product || '-', money(record.requirement?.budget_inr), record.status, <Actions key={record.id}><button onClick={() => onStatus('request', record.id, record.status)}>Change status</button></Actions>]; if (type === 'offers') return [record.supplier_name, money(record.price_inr), record.source || '-', record.status, <Actions key={record.id}><button onClick={() => onStatus('offer', record.id, record.status)}>Moderate</button></Actions>]; if (type === 'payments') return [record.buyer_email || '-', money(record.amount_inr), record.status, record.review_status || 'unreviewed', <Actions key={record.id}><button onClick={() => onPayment(record)}>Review payment</button></Actions>]; if (type === 'reviews') return [record.supplier_name, record.rating, record.comment || '-', record.visibility || 'visible', <Actions key={record.id}><button onClick={() => onReview(record)}>Hide/show</button></Actions>]; if (type === 'messages') return [record.sender_name || record.sender, record.offer_id, record.text, date(record.created_at)]; return [JSON.stringify(record)]; }); return <Panel title={`${type[0].toUpperCase()}${type.slice(1)} management`} action={<div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && reload()} placeholder="Search" className="w-40 border border-slate-700 bg-[#080b12] px-3 py-2 text-sm" />{statuses.length > 0 && <select value={status} onChange={(event) => { setStatus(event.target.value); setTimeout(reload, 0); }} className="border border-slate-700 bg-[#080b12] px-2 py-2 text-sm"><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>}<button onClick={reload} className="border border-slate-700 px-3 py-2 text-sm">Refresh</button></div>}><Table headers={headers} rows={rows} /></Panel>; }
function Actions({ children }) { return <div className="flex gap-2 whitespace-nowrap">{children}</div>; }
function Table({ headers, rows }) { return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-slate-800/70 align-top">{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-xs px-3 py-3 text-slate-300">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div>; }