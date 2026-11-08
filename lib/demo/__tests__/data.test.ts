import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDemoData } from '../data';

const fixtures = {
  demo_products: [{ id: 'demo-product-01', title: 'Sample', merchant: 'Demo', category: 'Stationery', price_krw: 12000, note: 'Fictional.' }],
  demo_customers: [{ id: 'demo-customer-01', display_name: 'Demo Customer A', destination_country: 'Japan' }],
  demo_shipments: [{ id: 'demo-shipment-01', customer_id: 'demo-customer-01', product_id: 'demo-product-01', status: 'REQUEST_RECEIVED', carrier_label: 'Sample carrier', tracking_label: 'SAMPLE_ONLY' }],
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getDemoData', () => {
  it('reads and validates only the three synthetic demo tables', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      const table = url.pathname.split('/').at(-1) as keyof typeof fixtures;
      return Response.json(fixtures[table]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getDemoData()).resolves.toEqual({
      products: fixtures.demo_products,
      customers: fixtures.demo_customers,
      shipments: fixtures.demo_shipments,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [request, init] of fetchMock.mock.calls) {
      expect(String(request)).toContain('/rest/v1/demo_');
      expect(new Headers(init?.headers).get('apikey')).toBe('public-test-key');
      expect(new Headers(init?.headers).has('Authorization')).toBe(false);
    }
  });

  it('surfaces missing database tables instead of rendering empty data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(getDemoData()).rejects.toThrow('Demo table "demo_products" is unavailable (HTTP 404).');
  });

  it('fails explicitly when public Supabase configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubGlobal('fetch', vi.fn());
    await expect(getDemoData()).rejects.toThrow('Supabase public configuration is missing.');
    expect(fetch).not.toHaveBeenCalled();
  });
});
