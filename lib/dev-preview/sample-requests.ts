export function previewSampleLabel(id: string): string | null {
  if (id === '11111111-1111-4111-8111-111111111111') return 'Preset example: book request';
  if (id === '22222222-2222-4222-8222-222222222222') return 'Preset example: shipment';
  return null;
}
