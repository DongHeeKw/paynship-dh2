import OperationalSettingsForm from '@/components/admin/OperationalSettingsForm';

export default function AdminSettingsPage() {
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Operational settings. Changes require a verified administrator account.</p>
      </div>
      <OperationalSettingsForm />
    </main>
  );
}
