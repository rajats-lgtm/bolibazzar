'use client';

import { useState } from 'react';
import { Panel, Button, Field, Input, Textarea, Select, Banner } from './ui';

/**
 * Send an announcement to everyone, or to one side of the marketplace.
 *
 * It goes through the in-app notification feed that every client — web, iOS and
 * Android — already reads, rather than a separate channel that would need its
 * own delivery guarantees.
 *
 * There is a confirmation step because this is irreversible and reaches every
 * user at once; an accidental Enter should not notify the whole platform.
 */
export default function Broadcast() {
  const [audience, setAudience] = useState('everyone');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const ready = title.trim() && body.trim();

  async function send() {
    setSending(true); setError('');
    const response = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience, title, body }),
    });
    const result = await response.json();
    setSending(false);
    setConfirming(false);
    if (!response.ok) { setError(result.error || 'Could not send'); return; }
    setNotice(`Sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`);
    setTitle(''); setBody('');
  }

  return (
    <div className="mt-6 max-w-2xl">
      <Banner tone="rose" onDismiss={() => setError('')}>{error}</Banner>
      <Banner tone="green" onDismiss={() => setNotice('')}>{notice}</Banner>

      <Panel title="Send an announcement" className="mt-4">
        <div className="space-y-4">
          <Field label="Audience">
            <Select
              value={audience}
              onChange={setAudience}
              options={[['everyone', 'Everyone'], ['buyers', 'Buyers only'], ['suppliers', 'Sellers only']]}
            />
          </Field>
          <Field label="Title" hint="Shown in bold in the notification feed.">
            <Input value={title} onChange={setTitle} placeholder="Scheduled maintenance on Sunday" />
          </Field>
          <Field label="Message">
            <Textarea value={body} onChange={setBody} rows={4} placeholder="BoliBazzar will be unavailable between 2am and 4am IST." />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          {confirming ? (
            <>
              <span className="text-sm text-amber-300">
                Send to {audience === 'everyone' ? 'every user' : audience}? This cannot be recalled.
              </span>
              <Button variant="primary" onClick={send} disabled={sending}>
                {sending ? 'Sending…' : 'Yes, send it'}
              </Button>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setConfirming(true)} disabled={!ready}>
              Review and send
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="Preview" className="mt-6">
        <div className="border border-slate-800 bg-[#080b12] p-4">
          <div className="text-sm font-medium text-slate-100">{title || 'Your title'}</div>
          <div className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{body || 'Your message appears here.'}</div>
          <div className="mt-2 text-[10px] text-slate-600">just now</div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          This is how it appears in the notification feed on web, iOS and Android.
        </p>
      </Panel>
    </div>
  );
}
