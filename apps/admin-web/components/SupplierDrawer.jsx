'use client';

import { useEffect, useState } from 'react';
import {
  Drawer, Button, Field, Input, Textarea, Select, Panel, Table, Pill, StatusPill, Banner, money, date,
} from './ui';

const CHECKS = [
  { key: 'gst_verified', label: 'GSTIN', hint: 'Checked against the GST portal.' },
  { key: 'address_verified', label: 'Registered address', hint: 'Matches the GST certificate.' },
  { key: 'phone_verified', label: 'Contact phone', hint: 'Reached a human at this number.' },
  { key: 'bank_verified', label: 'Bank account', hint: 'Payout account confirmed.' },
];

const STATUSES = ['pending_review', 'approved', 'rejected', 'suspended'];

/**
 * Everything about one seller, in one place: the business record, the KYC
 * checks, and what they have actually done on the platform.
 *
 * KYC is four independent checks rather than one approve button, because
 * "approved" on its own does not say which document a human actually looked
 * at. Each is stamped with who verified it and when, and revoking one is
 * recorded the same way as granting it.
 */
export default function SupplierDrawer({ id, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [draft, setDraft] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [detail, kycDetail] = await Promise.all([
      fetch(`/api/admin/suppliers/${id}`).then((r) => r.json()),
      fetch(`/api/admin/suppliers/${id}/kyc`).then((r) => r.json()),
    ]);
    if (detail.error) { setError(detail.error); return; }
    setData(detail);
    setKyc(kycDetail);
    setNote(kycDetail?.note || '');
    setDraft({});
  }
  useEffect(() => { if (id) load(); }, [id]);

  if (!id) return null;

  const supplier = data?.supplier;
  const field = (key) => (key in draft ? draft[key] : supplier?.[key] ?? '');
  const set = (key, value) => { setDraft((p) => ({ ...p, [key]: value })); setNotice(''); };
  const dirty = Object.keys(draft);

  async function saveProfile() {
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/suppliers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not save'); return; }
    setNotice('Business details saved.');
    await load();
    onSaved?.();
  }

  async function setStatus(status) {
    const reason = window.prompt(`Reason for marking this seller "${status}" (optional)`) ?? '';
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/suppliers/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, reason }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not change status'); return; }
    setNotice(`Seller is now ${status}.`);
    await load();
    onSaved?.();
  }

  async function toggleCheck(key, next) {
    setBusy(true); setError('');
    const response = await fetch(`/api/admin/suppliers/${id}/kyc`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: next, kyc_note: note }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Could not record that check'); return; }
    setNotice(next ? 'Marked verified.' : 'Verification revoked.');
    await load();
    onSaved?.();
  }

  const allVerified = kyc && CHECKS.every((c) => kyc.checks?.[c.key]?.verified);

  return (
    <Drawer
      open
      onClose={onClose}
      title={supplier?.business_name || 'Seller'}
      subtitle={supplier ? `${supplier.email} · ${supplier.city || 'no city'}` : ''}
      footer={
        dirty.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-400">{dirty.length} unsaved change{dirty.length === 1 ? '' : 's'}</span>
            <div className="flex gap-2">
              <Button onClick={() => setDraft({})}>Discard</Button>
              <Button variant="primary" onClick={saveProfile} disabled={busy}>Save details</Button>
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
          {/* --- standing ------------------------------------------------- */}
          <Panel title="Account standing">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill value={supplier.status} />
              {supplier.is_demo && <Pill tone="cyan">demo bidder</Pill>}
              {allVerified ? <Pill tone="green">KYC complete</Pill> : <Pill tone="amber">KYC incomplete</Pill>}
              <span className="text-xs text-slate-500">joined {date(supplier.created_at)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== supplier.status).map((status) => (
                <Button key={status} onClick={() => setStatus(status)} disabled={busy}
                  variant={status === 'suspended' || status === 'rejected' ? 'danger' : 'default'}>
                  Mark {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
            {supplier.status_reason && (
              <p className="mt-3 text-xs text-slate-500">Last reason: {supplier.status_reason}</p>
            )}
          </Panel>

          {/* --- KYC ------------------------------------------------------ */}
          <Panel title="Identity & compliance">
            <div className="space-y-1">
              {CHECKS.map((check) => {
                const state = kyc?.checks?.[check.key] || {};
                return (
                  <div key={check.key} className="flex items-start justify-between gap-4 border-b border-slate-900 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-slate-200">
                        {check.label}
                        {state.verified ? <Pill tone="green">verified</Pill> : <Pill tone="amber">not verified</Pill>}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{check.hint}</div>
                      {state.verified && state.at && (
                        <div className="mt-1 text-xs text-slate-600">by {state.by} · {date(state.at)}</div>
                      )}
                    </div>
                    <Button
                      onClick={() => toggleCheck(check.key, !state.verified)}
                      disabled={busy}
                      variant={state.verified ? 'danger' : 'primary'}
                    >
                      {state.verified ? 'Revoke' : 'Verify'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {kyc?.gst_format_valid && (
              <p className={`mt-3 text-xs ${kyc.gst_format_valid.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                GSTIN check digit: {kyc.gst_format_valid.valid ? 'valid' : kyc.gst_format_valid.reason}
              </p>
            )}

            <div className="mt-4">
              <Field label="Verification note" hint="Saved with the next check you record.">
                <Textarea value={note} onChange={setNote} rows={2} placeholder="What did you check, and where?" />
              </Field>
            </div>

            {!!kyc?.history?.length && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">Verification history</h3>
                <Table
                  headers={['When', 'Who', 'Checks', 'Note']}
                  rows={kyc.history.map((event) => [
                    date(event.created_at),
                    event.actor_email,
                    Object.entries(event.checks || {}).map(([k, v]) => `${k.replace('_verified', '')}: ${v ? 'yes' : 'revoked'}`).join(', '),
                    event.note || '-',
                  ])}
                />
              </div>
            )}
          </Panel>

          {/* --- business record ----------------------------------------- */}
          <Panel title="Business details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registered business name"><Input value={field('business_name')} onChange={(v) => set('business_name', v)} /></Field>
              <Field label="Contact person"><Input value={field('contact_name')} onChange={(v) => set('contact_name', v)} /></Field>
              <Field label="GSTIN" hint="Changing this clears any existing GST verification.">
                <Input value={field('gst')} onChange={(v) => set('gst', v.toUpperCase())} />
              </Field>
              <Field label="Phone"><Input value={field('phone')} onChange={(v) => set('phone', v)} /></Field>
              <Field label="City"><Input value={field('city')} onChange={(v) => set('city', v)} /></Field>
              <Field label="PIN code"><Input value={field('pincode')} onChange={(v) => set('pincode', v)} /></Field>
              <Field label="Business type">
                <Select
                  value={field('supplier_type')}
                  onChange={(v) => set('supplier_type', v)}
                  options={(data.supplier_types || []).map((t) => [t, t.replace(/_/g, ' ')])}
                />
              </Field>
              <Field label="Rating" hint="0–5. Shown to buyers.">
                <Input type="number" value={field('rating')} onChange={(v) => set('rating', Number(v))} />
              </Field>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Registered address"><Textarea value={field('address')} onChange={(v) => set('address', v)} rows={2} /></Field>
              <Field label="Brand authorisations" hint="Comma separated. Controls which requests they are alerted to.">
                <Input
                  value={Array.isArray(field('brand_authorisations')) ? field('brand_authorisations').join(', ') : ''}
                  onChange={(v) => set('brand_authorisations', v.split(',').map((x) => x.trim()).filter(Boolean))}
                />
              </Field>
              <Field label="Categories" hint="Comma separated.">
                <Input
                  value={Array.isArray(field('categories')) ? field('categories').join(', ') : ''}
                  onChange={(v) => set('categories', v.split(',').map((x) => x.trim()).filter(Boolean))}
                />
              </Field>
              <Field label="Internal notes" hint="Never shown to the seller or to buyers.">
                <Textarea value={field('notes')} onChange={(v) => set('notes', v)} />
              </Field>
            </div>
          </Panel>

          {/* --- activity ------------------------------------------------- */}
          <Panel title={`Recent offers (${data.offers.length})`}>
            <Table
              headers={['Price', 'Status', 'Source', 'When']}
              rows={data.offers.slice(0, 10).map((offer) => [
                money(offer.price_inr), <StatusPill key={offer.id} value={offer.status} />, offer.source || '-', date(offer.created_at),
              ])}
              empty="This seller has not bid yet."
            />
          </Panel>

          <Panel title={`Orders won (${data.orders.length})`}>
            <Table
              headers={['Tracking', 'Product', 'Amount', 'Stage']}
              rows={data.orders.slice(0, 10).map((order) => [
                order.tracking_id, order.product, money(order.amount_inr), <StatusPill key={order.id} value={order.stage} />,
              ])}
              empty="No orders yet."
            />
          </Panel>
        </div>
      )}
    </Drawer>
  );
}
