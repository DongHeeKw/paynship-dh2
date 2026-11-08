import { z } from 'zod';

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  merchant: z.string(),
  category: z.string(),
  price_krw: z.number().int().nonnegative(),
  note: z.string(),
});

const customerSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  destination_country: z.string(),
});

const shipmentSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  product_id: z.string(),
  status: z.string(),
  carrier_label: z.string(),
  tracking_label: z.string(),
});

export type DemoProduct = z.infer<typeof productSchema>;
export type DemoCustomer = z.infer<typeof customerSchema>;
export type DemoShipment = z.infer<typeof shipmentSchema>;

async function fetchDemoRows<T extends z.ZodType>(
  table: string,
  columns: string,
  schema: T,
): Promise<z.infer<T>[]> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !anonKey) throw new Error('Supabase public configuration is missing.');

  let endpoint: URL;
  try {
    endpoint = new URL(`/rest/v1/${table}`, projectUrl);
  } catch {
    throw new Error('Supabase project URL is invalid.');
  }
  endpoint.searchParams.set('select', columns);
  endpoint.searchParams.set('order', 'id.asc');

  const response = await fetch(endpoint, {
    headers: { apikey: anonKey },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Demo table "${table}" is unavailable (HTTP ${response.status}).`);

  const payload: unknown = await response.json();
  return z.array(schema).parse(payload);
}

export function getDemoData() {
  return Promise.all([
    fetchDemoRows('demo_products', 'id,title,merchant,category,price_krw,note', productSchema),
    fetchDemoRows('demo_customers', 'id,display_name,destination_country', customerSchema),
    fetchDemoRows('demo_shipments', 'id,customer_id,product_id,status,carrier_label,tracking_label', shipmentSchema),
  ]).then(([products, customers, shipments]) => ({ products, customers, shipments }));
}
