'use client';

import { useCallback, useEffect, useState } from 'react';
import { Panel, Table, Button, Pill, StatusPill, Banner, money, date } from '../components/ui';
import Settings from '../components/Settings';
import Broadcast from '../components/Broadcast';
import CustomerDrawer from '../components/CustomerDrawer';
import SupplierDrawer from '../components/SupplierDrawer';

/**
 * The operations console.
 *
 * Everything here is a view onto `/api/admin/*`, which is the only place
 * authorisation is decided — the UI hides actions an operator should not take,
 * but the API refuses them regardless, so a hidden button is a courtesy rather
 * than a control.
 *
 * Every write is recorded in the audit trail with who did it and what changed.
 */

const TABS = [
  ['overview', 'Overview'],
  ['customers', 'Customers'],
  ['suppliers', 'Sellers'],
  ['requests', 'Requests'],
  ['offers', 'Offers'],
  ['orders', 'Orders'],
  ['payments', 'Payments'],
  ['reviews', 'Reviews'],
  ['messages', 'Messages'],
  ['broadcast', 'Broadcast'],
  ['audit', 'Audit'],
  ['settings', 'Settings'],
];

/** Tabs that render their own component rather than a record table. */
const CUSTOM_TABS = new Set(['overview', 'audit', 'settings', 'broadcast']);

export default function AdminPortal() {
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ email: '', access_key: '' });
  const [tab, setTab] = useState('overview');
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [audit, setAudit] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openCustomer, setOpenCustomer] = useState(null);
  const [openSupplier, setOpenSupplier] = useState(null);

  async function loadSession() {
    const response = await fetch('/api/admin/session');
    const auth = await response.json();
    if (auth.authenticated) setSession(auth.email);
    setLoading(false);
  }

  const loadTab = useCallback(async (nextTab = tab) => {
    setError('');
    if (CUSTOM_TABS.has(nextTab) && nextTab !== 'overview' && nextTab !== 'audit') return;

    if (nextTab === 'overview') {
      const response = await fetch('/api/admin/overview');
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Could not load overview');
      setMetrics(data.metrics || {});
      setRecords(data.requests || []);
      return;
    }
    if (nextTab === 'audit') {
      const response = await fetch('/api/admin/audit');
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Could not load audit trail');
      setAudit(data.audit || []);
      return;
    }
    const params = new URLSearchParams({ type: nextTab, limit: '250' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/records?${params}`);
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Could not load records');
    setRecords(data.records || []);
  }, [tab, search, status]);

  useEffect(() => { loadSession(); }, []);
  useEffect(() => { if (session) loadTab(tab); }, [session, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(event) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/admin/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Access denied');
    setForm({ email: '', access_key: '' });
    setSession(data.email);
  }

  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setSession(null);
  }

  async function mutate(url, body, method = 'PATCH') {
    const response = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Operation failed'); return false; }
    await loadTab(tab);
    return true;
  }

  const reason = (label) => window.prompt(`${label} reason (optional)`) || '';

  async function statusAction(type, id, current) {
    const next = window.prompt(`New ${type} status`, current || 'approved');
    if (!next) return;
    const path = { supplier: 'suppliers', request: 'requests', offer: 'offers' }[type];
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
  async function orderAction(record) {
    const next = window.prompt('New delivery stage', record.stage || 'shipped');
    if (next) await mutate(`/api/admin/orders/${record.id}`, { stage: next });
  }

  if (loading) {
    return <main className="min-h-screen bg-[#080b12] text-slate-200 grid place-items-center">Loading secure console...</main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#080b12] text-slate-200 grid place-items-center px-6">
        <form onSubmit={login} className="w-full max-w-md border border-slate-700 bg-[#101722] p-8 shadow-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Restricted operations</div>
          <h1 className="mt-3 text-3xl font-semibold">CEO control room</h1>
          <p className="mt-2 text-sm text-slate-400">Private BoliBazzar administration. Every action is logged.</p>
          <label className="mt-8 block text-sm text-slate-300">
            CEO email
            <input required type="email" value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-2 w-full border border-slate-600 bg-[#080b12] px-3 py-3 outline-none focus:border-cyan-400" />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Access key
            <input required type="password" value={form.access_key}
              onChange={(event) => setForm({ ...form, access_key: event.target.value })}
              className="mt-2 w-full border border-slate-600 bg-[#080b12] px-3 py-3 outline-none focus:border-cyan-400" />
          </label>
          {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
          <button className="mt-6 w-full bg-cyan-400 px-4 py-3 font-semibold text-slate-950">Enter secure console</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-slate-200">
      <header className="border-b border-slate-800 bg-[#0d131d] px-8 py-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Private operations</div>
          <h1 className="mt-1 text-2xl font-semibold">CEO control room</h1>
          <p className="text-xs text-slate-500">Signed in as {session}</p>
        </div>
        <button onClick={logout} className="border border-slate-700 px-4 py-2 text-sm text-slate-300">Lock console</button>
      </header>

      <div className="mx-auto max-w-[1500px] px-8 py-6">
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSearch(''); setStatus(''); }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${
                tab === key ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <Banner tone="rose" onDismiss={() => setError('')}>{error}</Banner>

        {tab === 'overview' && <Overview metrics={metrics} records={records} />}
        {tab === 'audit' && (
          <Panel title="Immutable operational audit trail" className="mt-6">
            <Table
              headers={['Action', 'Actor', 'Details', 'When']}
              rows={audit.map((record) => [
                <Pill key={record.id} tone="cyan">{record.action}</Pill>,
                record.actor_email || 'system',
                <code key={`${record.id}-d`} className="block max-w-xl truncate text-xs text-slate-500">
                  {JSON.stringify(record.details || {})}
                </code>,
                date(record.created_at),
              ])}
              empty="No admin actions recorded yet."
            />
          </Panel>
        )}
        {tab === 'settings' && <Settings />}
        {tab === 'broadcast' && <Broadcast />}

        {!CUSTOM_TABS.has(tab) && (
          <Records
            type={tab}
            records={records}
            search={search}
            status={status}
            setSearch={setSearch}
            setStatus={setStatus}
            reload={() => loadTab(tab)}
            onOpenCustomer={setOpenCustomer}
            onOpenSupplier={setOpenSupplier}
            onStatus={statusAction}
            onPayment={paymentAction}
            onReview={reviewAction}
            onOrder={orderAction}
          />
        )}
      </div>

      {openCustomer && (
        <CustomerDrawer email={openCustomer} onClose={() => setOpenCustomer(null)} onSaved={() => loadTab(tab)} />
      )}
      {openSupplier && (
        <SupplierDrawer id={openSupplier} onClose={() => setOpenSupplier(null)} onSaved={() => loadTab(tab)} />
      )}
    </main>
  );
}

function Overview({ metrics, records }) {
  const tiles = [
    ['Requests', metrics.request_count],
    ['Offers', metrics.offer_count],
    ['Pending', metrics.pending_offers],
    ['Paid orders', metrics.paid_orders],
    ['Sellers', metrics.supplier_count],
    ['Payment volume', money(metrics.payment_volume_inr)],
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {tiles.map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-[#101722] p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-cyan-300">{value ?? 0}</div>
          </div>
        ))}
      </div>
      <Panel title="Request watchlist">
        <Table
          headers={['Request', 'Buyer', 'Offers', 'Status', 'Budget']}
          rows={records.slice(0, 12).map((record) => [
            record.requirement?.summary || record.requirement?.product || '-',
            record.buyer_email || 'guest',
            record.offer_count || 0,
            <StatusPill key={record.id} value={record.status} />,
            money(record.requirement?.budget_inr),
          ])}
        />
      </Panel>
    </div>
  );
}

function Records({
  type, records, search, status, setSearch, setStatus, reload,
  onOpenCustomer, onOpenSupplier, onStatus, onPayment, onReview, onOrder,
}) {
  const statuses = {
    suppliers: ['pending_review', 'approved', 'rejected', 'suspended'],
    requests: ['open', 'closed', 'cancelled', 'escalated'],
    payments: ['created', 'paid', 'failed'],
    orders: ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'],
  }[type] || [];

  const headers = {
    customers: ['Name', 'Email', 'Status', 'Spend', 'Last login', ''],
    suppliers: ['Business', 'Email', 'City', 'KYC', 'Status', ''],
    requests: ['Buyer', 'Product', 'Budget', 'Status', ''],
    offers: ['Seller', 'Price', 'Source', 'Status', ''],
    orders: ['Tracking', 'Buyer', 'Amount', 'Stage', ''],
    payments: ['Buyer', 'Amount', 'Payment', 'Review', ''],
    reviews: ['Seller', 'Rating', 'Comment', 'Visibility', ''],
    messages: ['Sender', 'Offer', 'Message', 'When'],
  }[type] || ['Record'];

  const rows = records.map((record) => {
    if (type === 'customers') {
      return [
        record.name || '-', record.email,
        <StatusPill key={record.email} value={record.status || 'active'} />,
        money(record.total_spent_inr), date(record.last_login),
        <Button key={`${record.email}-a`} onClick={() => onOpenCustomer(record.email)}>Open</Button>,
      ];
    }
    if (type === 'suppliers') {
      const checks = ['gst_verified', 'address_verified', 'phone_verified', 'bank_verified'];
      const done = checks.filter((c) => record[c]).length;
      return [
        record.business_name, record.email, record.city || '-',
        <Pill key={`${record.id}-k`} tone={done === checks.length ? 'green' : done ? 'amber' : 'slate'}>{done}/{checks.length}</Pill>,
        <StatusPill key={record.id} value={record.status} />,
        <Button key={`${record.id}-a`} onClick={() => onOpenSupplier(record.id)}>Open</Button>,
      ];
    }
    if (type === 'requests') {
      return [
        record.buyer_email || 'guest',
        record.requirement?.summary || record.requirement?.product || '-',
        money(record.requirement?.budget_inr),
        <StatusPill key={record.id} value={record.status} />,
        <Button key={`${record.id}-a`} onClick={() => onStatus('request', record.id, record.status)}>Change status</Button>,
      ];
    }
    if (type === 'offers') {
      return [
        record.supplier_name, money(record.price_inr), record.source || '-',
        <StatusPill key={record.id} value={record.status} />,
        <Button key={`${record.id}-a`} onClick={() => onStatus('offer', record.id, record.status)}>Moderate</Button>,
      ];
    }
    if (type === 'orders') {
      return [
        record.tracking_id, record.buyer_email || '-', money(record.amount_inr),
        <StatusPill key={record.id} value={record.stage} />,
        <Button key={`${record.id}-a`} onClick={() => onOrder(record)}>Change stage</Button>,
      ];
    }
    if (type === 'payments') {
      return [
        record.buyer_email || '-', money(record.amount_inr),
        <StatusPill key={record.id} value={record.status} />,
        <StatusPill key={`${record.id}-r`} value={record.review_status || 'unreviewed'} />,
        <Button key={`${record.id}-a`} onClick={() => onPayment(record)}>Review</Button>,
      ];
    }
    if (type === 'reviews') {
      return [
        record.supplier_name, `${record.rating} / 5`, record.comment || '-',
        <StatusPill key={record.id} value={record.visibility || 'visible'} />,
        <Button key={`${record.id}-a`} onClick={() => onReview(record)}>
          {record.visibility === 'hidden' ? 'Show' : 'Hide'}
        </Button>,
      ];
    }
    if (type === 'messages') {
      return [record.sender_name || record.sender, record.offer_id, record.text, date(record.created_at)];
    }
    return [JSON.stringify(record)];
  });

  return (
    <Panel
      title={`${type[0].toUpperCase()}${type.slice(1)} management`}
      className="mt-6"
      action={
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && reload()}
            placeholder="Search"
            className="w-40 border border-slate-700 bg-[#080b12] px-3 py-2 text-sm"
          />
          {statuses.length > 0 && (
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setTimeout(reload, 0); }}
              className="border border-slate-700 bg-[#080b12] px-2 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          )}
          <Button onClick={reload}>Refresh</Button>
        </div>
      }
    >
      <Table headers={headers} rows={rows} />
    </Panel>
  );
}
