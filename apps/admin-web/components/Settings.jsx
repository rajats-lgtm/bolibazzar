'use client';

import { useEffect, useState } from 'react';
import { Panel, Button, Field, Input, Textarea, Toggle, Banner } from './ui';

/**
 * Platform settings.
 *
 * The catalogue — which settings exist, their types, bounds and hints — comes
 * from the API rather than being restated here, so adding a setting to
 * lib/settings.js makes it appear in this tab with the right control and no UI
 * change at all.
 *
 * Edits are held locally until Save, so an operator can change several related
 * values (a tier threshold and its cashback, say) and apply them together
 * rather than leaving the platform in a half-changed state between saves.
 */
export default function Settings() {
  const [groups, setGroups] = useState([]);
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch('/api/admin/settings');
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Could not load settings'); setLoading(false); return; }
    setGroups(data.groups || []);
    setDraft({});
    setErrors({});
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const dirty = Object.keys(draft);

  function set(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
    setNotice('');
  }

  function valueOf(setting) {
    return setting.key in draft ? draft[setting.key] : setting.value;
  }

  async function save() {
    if (!dirty.length) return;
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: dirty.map((key) => ({ key, value: draft[key] })) }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      // The API reports per-key reasons, so show them against the fields
      // rather than as one opaque failure.
      setErrors(data.errors || {});
      setError(data.error || 'Could not save');
      return;
    }
    setGroups(data.groups || []);
    setDraft({});
    setNotice(`Saved ${dirty.length} setting${dirty.length === 1 ? '' : 's'}. Live immediately.`);
  }

  async function reset(key) {
    const response = await fetch(`/api/admin/settings/${key}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Could not reset'); return; }
    setGroups(data.groups || []);
    setDraft(({ [key]: _removed, ...rest }) => rest);
    setNotice(`"${key}" is back to its default.`);
  }

  if (loading) return <p className="mt-6 text-sm text-slate-500">Loading settings…</p>;

  return (
    <div className="mt-6 space-y-6 pb-24">
      <Banner tone="rose" onDismiss={() => setError('')}>{error}</Banner>
      <Banner tone="green" onDismiss={() => setNotice('')}>{notice}</Banner>

      {groups.map((group) => (
        <Panel key={group.key} title={group.label}>
          {group.hint && <p className="-mt-2 mb-4 text-xs text-slate-500">{group.hint}</p>}
          <div className="space-y-4">
            {group.settings.map((setting) => {
              const current = valueOf(setting);
              const changed = setting.key in draft;
              const overridden = JSON.stringify(setting.value) !== JSON.stringify(setting.default);

              return (
                <div
                  key={setting.key}
                  className={`border-l-2 pl-4 ${changed ? 'border-cyan-400' : 'border-transparent'}`}
                >
                  {setting.type === 'boolean' ? (
                    <Toggle value={current} onChange={(v) => set(setting.key, v)} label={setting.label} hint={setting.hint} />
                  ) : (
                    <Field
                      label={`${setting.label}${setting.unit ? ` (${setting.unit})` : ''}`}
                      hint={setting.hint}
                      error={errors[setting.key]}
                    >
                      {setting.type === 'text' ? (
                        <Textarea value={current} onChange={(v) => set(setting.key, v)} />
                      ) : (
                        <Input
                          type={setting.type === 'number' ? 'number' : 'text'}
                          value={current}
                          onChange={(v) => set(setting.key, setting.type === 'number' ? Number(v) : v)}
                        />
                      )}
                    </Field>
                  )}

                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                    <code className="text-slate-500">{setting.key}</code>
                    {setting.type === 'number' && setting.min !== null && (
                      <span>allowed {setting.min}–{setting.max}</span>
                    )}
                    {overridden && (
                      <button onClick={() => reset(setting.key)} className="text-slate-500 underline hover:text-slate-300">
                        reset to default ({String(setting.default)})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}

      {/* Sticky so the operator never has to scroll back up to apply a change. */}
      {dirty.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#0d131d]/95 px-8 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <p className="text-sm text-slate-300">
              {dirty.length} unsaved change{dirty.length === 1 ? '' : 's'}
              <span className="ml-2 text-slate-500">{dirty.join(', ')}</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={() => { setDraft({}); setErrors({}); }}>Discard</Button>
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
