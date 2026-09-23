'use client';

import { useEffect, useState } from 'react';
import {
  Drawer, Button, Field, Input, Textarea, Panel, Table, Pill, StatusPill, Banner, money, date,
} from './ui';

/**
 * Everything about one buyer: their profile, their wallet, and what they have
 * bought. Spend is editable because support occasionally has to correct a
 * figure after a refund — and because spend drives the loyalty tier, the API
 * recomputes the tier rather than letting the two disagree.
 */
export default function CustomerDrawer({ email, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(email)}`);
    const detail = await response.json();
    if (!response.ok) { setError(detail.error || 'Could not load customer'); return; }
    setData(detail);
    setDraft({});
  }
  useEffect(() => { if (email) load(); }, [email]);

  if (!email) return null;

  const customer = data?.customer;
  const field = (key) => (key in draft ? draft[key] : customer?.[key] ?? '');
  const set = (key, value) => { setDraft((p) => ({ ...p, [key]: value })); setNotice(''); };
  const dirty = Object.keys(draft);

  async function save() {
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(email)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not save'); return; }
    setNotice('Profile saved.');
    await load();
    onSaved?.();
  }

  async function setStatus(status) {
    const reason = window.prompt(`Reason for marking this account "${status}" (optional)`) ?? '';
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(email)}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reason }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not change status'); return; }
    // Suspension ends any session they already have, so say so — otherwise it
    // looks like nothing happened until they try to act.
    setNotice(status === 'suspended'
      ? 'Suspended. Any session they already had is now refused.'
      : 'Account restored.');
    await load();
    onSaved?.();
  }

  async function adjustWallet() {
    const amount = window.prompt('Wallet adjustment in rupees. Use a negative value to debit.');
    if (!amount) return;
    const reason = window.prompt('Reason (optional)') ?? '';
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/customers/${encodeURIComponent(email)}/wallet`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount_inr: Number(amount), reason }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not adjust the wallet'); return; }
    setNotice(`Wallet is now ${money(result.balance_inr)}.`);
    await load();
    onSaved?.();
  }

  const suspended = customer?.status === 'suspended';

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer?.name || email}
      subtitle={customer ? `${customer.email} · joined ${date(customer.created_at)}` : ''}
      footer={
        dirty.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-400">{dirty.length} unsaved change{dirty.length === 1 ? '' : 's'}</span>
            <div className="flex gap-2">
              <Button onClick={() => setDraft({})}>Discard</Button>
              <Button variant="primary" onClick={save} disabled={busy}>Save profile</Button>
            </div>
          </div>
        )
      }
    >
      <Banner tone="rose" onDismiss={() => setError('')}>{error}</Banner>
      <Banner tone="green" onDismiss={() => setNotice('')}>{notice}</Banner>

      {!data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <Panel title="Account standing">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill value={customer.status || 'active'} />
              {customer.tier && <Pill tone="cyan">{customer.tier.label || customer.tier.tier} · {customer.tier.cashback_pct}% cashback</Pill>}
              <span className="text-xs text-slate-500">last seen {date(customer.last_login)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant={suspended ? 'primary' : 'danger'} onClick={() => setStatus(suspended ? 'active' : 'suspended')} disabled={busy}>
                {suspended ? 'Restore account' : 'Suspend account'}
              </Button>
              <Button onClick={adjustWallet} disabled={busy}>Adjust wallet</Button>
            </div>
            {customer.status_reason && <p className="mt-3 text-xs text-slate-500">Last reason: {customer.status_reason}</p>}
          </Panel>

          <Panel title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input value={field('name')} onChange={(v) => set('name', v)} /></Field>
              <Field label="Phone"><Input value={field('phone')} onChange={(v) => set('phone', v)} /></Field>
              <Field label="Email" hint="The account identifier. Not editable.">
                <Input value={customer.email} onChange={() => {}} disabled />
              </Field>
              <Field label="Lifetime spend" hint="Drives the loyalty tier, which is recalculated on save.">
                <Input type="number" value={field('total_spent_inr')} onChange={(v) => set('total_spent_inr', Number(v))} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Internal notes" hint="Never shown to the customer.">
                <Textarea value={field('notes')} onChange={(v) => set('notes', v)} />
              </Field>
            </div>
          </Panel>

          <Panel title="Wallet">
            <p className="text-2xl font-semibold text-cyan-300">{money(data.wallet?.balance_inr)}</p>
            <div className="mt-3">
              <Table
                headers={['Type', 'Amount', 'Reason', 'When']}
                rows={(data.wallet?.transactions || []).slice(-10).reverse().map((t) => [
                  <Pill key={t.id} tone={t.type === 'credit' ? 'green' : 'amber'}>{t.type}</Pill>,
                  money(t.amount), t.reason || '-', date(t.at),
                ])}
                empty="No wallet activity yet."
              />
            </div>
          </Panel>

          <Panel title={`Orders (${data.orders.length})`}>
            <Table
              headers={['Tracking', 'Product', 'Amount', 'Stage']}
              rows={data.orders.slice(0, 10).map((order) => [
                order.tracking_id, order.product, money(order.amount_inr), <StatusPill key={order.id} value={order.stage} />,
              ])}
              empty="No orders yet."
            />
          </Panel>

          <Panel title={`Requests (${data.requests.length})`}>
            <Table
              headers={['Product', 'Budget', 'Status', 'When']}
              rows={data.requests.slice(0, 10).map((request) => [
                request.requirement?.summary || request.requirement?.product || '-',
                money(request.requirement?.budget_inr),
                <StatusPill key={request.id} value={request.status} />,
                date(request.created_at),
              ])}
              empty="No requests yet."
            />
          </Panel>
        </div>
      )}
    </Drawer>
  );
}
