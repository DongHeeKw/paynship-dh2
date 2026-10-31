'use client';

import { useEffect, useState } from 'react';

interface Settings {
  maintenanceMode: boolean;
  shopifyEnabled: boolean;
  adminRole?: string;
}

const FIELDS = [
  { key: 'maintenanceMode', label: 'Maintenance mode', detail: 'Pause new purchase and payment requests during maintenance.' },
  { key: 'shopifyEnabled', label: 'Hosted payment', detail: 'Enable the configured provider for reviewed purchase requests.' },
] as const;

export default function OperationalSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState('Loading settings…');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin-settings', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Admin access and a database connection are required.');
        return response.json() as Promise<Settings>;
      })
      .then(value => { setSettings(value); setMessage(''); })
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode: settings.maintenanceMode,
          shopifyEnabled: settings.shopifyEnabled,
        }),
      });
      if (!response.ok) throw new Error('Settings could not be saved.');
      setSettings(await response.json());
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const readOnly = settings?.adminRole !== 'super_admin' || saving;
  return (
    <div className="max-w-xl space-y-6">
      {settings && FIELDS.map(field => (
        <label key={field.key} className="flex items-start gap-3 border-b border-gray-200 pb-5">
          <input type="checkbox" className="mt-1 accent-black" checked={settings[field.key]} disabled={readOnly}
            onChange={event => setSettings({ ...settings, [field.key]: event.target.checked })} />
          <span><span className="block font-medium">{field.label}</span><span className="text-sm text-gray-600">{field.detail}</span></span>
        </label>
      ))}
      {settings && <button type="button" disabled={readOnly} onClick={save}
        className="border border-black bg-black px-5 py-2 text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save settings'}</button>}
      <p role="status" className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
