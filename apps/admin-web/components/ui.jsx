'use client';

import { useEffect } from 'react';

/**
 * Shared primitives for the console.
 *
 * Deliberately plain: this is an internal operations tool, so legibility and
 * density matter more than polish. Everything is keyboard-reachable because an
 * operator working through a queue of approvals should not need the mouse.
 */

export const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
export const date = (value) => (value ? new Date(value).toLocaleString('en-IN') : '-');

export function Panel({ title, children, action, className = '' }) {
  return (
    <section className={`border border-slate-800 bg-[#101722] p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ headers, rows, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-xs uppercase tracking-wider text-slate-500 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-900 hover:bg-slate-900/40">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 align-top text-slate-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Button({ children, onClick, variant = 'default', type = 'button', disabled, className = '' }) {
  const styles = {
    default: 'border border-slate-700 text-slate-200 hover:bg-slate-800',
    primary: 'bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300',
    danger: 'border border-rose-800 text-rose-300 hover:bg-rose-950/40',
    ghost: 'text-slate-400 hover:text-slate-100',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-800 text-slate-300',
    green: 'bg-emerald-950 text-emerald-300 border border-emerald-900',
    amber: 'bg-amber-950 text-amber-300 border border-amber-900',
    rose: 'bg-rose-950 text-rose-300 border border-rose-900',
    cyan: 'bg-cyan-950 text-cyan-300 border border-cyan-900',
  };
  return <span className={`inline-block px-2 py-0.5 text-xs ${tones[tone] || tones.slate}`}>{children}</span>;
}

/** Status values map to a colour so a queue can be scanned at a glance. */
export function StatusPill({ value }) {
  const tone = {
    approved: 'green', active: 'green', paid: 'green', delivered: 'green', visible: 'green', reconciled: 'green',
    pending_review: 'amber', pending: 'amber', open: 'amber', created: 'amber', unreviewed: 'amber', investigate: 'amber',
    rejected: 'rose', suspended: 'rose', failed: 'rose', cancelled: 'rose', hidden: 'rose',
    escalated: 'cyan', closed: 'slate',
  }[value] || 'slate';
  return <Pill tone={tone}>{value || '-'}</Pill>;
}

export function Field({ label, hint, children, error }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export function Input({ value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1.5 w-full border border-slate-700 bg-[#080b12] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-50"
    />
  );
}

export function Textarea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1.5 w-full border border-slate-700 bg-[#080b12] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
    />
  );
}

export function Select({ value, onChange, options, disabled }) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1.5 w-full border border-slate-700 bg-[#080b12] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-50"
    >
      {options.map((option) => {
        const [key, label] = Array.isArray(option) ? option : [option, option];
        return <option key={key} value={key}>{label}</option>;
      })}
    </select>
  );
}

export function Toggle({ value, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-slate-200">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-cyan-400' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

/**
 * Side drawer for editing one record.
 *
 * Closes on Escape and on a click outside, because an operator moving through
 * a list should be able to dismiss without aiming at a small button.
 */
export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label={title} className="flex w-full max-w-2xl flex-col border-l border-slate-800 bg-[#0d131d] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-100">{title}</h2>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-800 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

export function Banner({ tone = 'rose', children, onDismiss }) {
  if (!children) return null;
  const tones = {
    rose: 'border-rose-900 bg-rose-950/40 text-rose-300',
    green: 'border-emerald-900 bg-emerald-950/40 text-emerald-300',
  };
  return (
    <div className={`mt-4 flex items-start justify-between gap-4 border px-4 py-3 text-sm ${tones[tone]}`}>
      <div>{children}</div>
      {onDismiss && <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100">Dismiss</button>}
    </div>
  );
}
