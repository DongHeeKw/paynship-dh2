-- Synthetic, public demo data only. This does not create Supabase Auth users
-- or write to the application's real users, products, orders, or shipments.
BEGIN;

CREATE TABLE IF NOT EXISTS public.demo_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  price_krw INTEGER NOT NULL CHECK (price_krw >= 0),
  note TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_demo)
);

CREATE TABLE IF NOT EXISTS public.demo_customers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_demo)
);

CREATE TABLE IF NOT EXISTS public.demo_shipments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.demo_customers(id),
  product_id TEXT NOT NULL REFERENCES public.demo_products(id),
  status TEXT NOT NULL,
  carrier_label TEXT NOT NULL,
  tracking_label TEXT NOT NULL DEFAULT 'SAMPLE_ONLY',
  is_demo BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_demo)
);

ALTER TABLE public.demo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_shipments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.demo_products, public.demo_customers, public.demo_shipments FROM PUBLIC;
GRANT SELECT ON public.demo_products, public.demo_customers, public.demo_shipments TO anon, authenticated;

DROP POLICY IF EXISTS "public reads synthetic demo products" ON public.demo_products;
CREATE POLICY "public reads synthetic demo products"
  ON public.demo_products FOR SELECT TO anon, authenticated USING (is_demo);
DROP POLICY IF EXISTS "public reads synthetic demo customers" ON public.demo_customers;
CREATE POLICY "public reads synthetic demo customers"
  ON public.demo_customers FOR SELECT TO anon, authenticated USING (is_demo);
DROP POLICY IF EXISTS "public reads synthetic demo shipments" ON public.demo_shipments;
CREATE POLICY "public reads synthetic demo shipments"
  ON public.demo_shipments FOR SELECT TO anon, authenticated USING (is_demo);

INSERT INTO public.demo_products (id, title, merchant, category, price_krw, note)
VALUES
  ('demo-product-01', 'Demo stationery bundle', 'Sample Seoul Store', 'Stationery', 12000, 'Fictional sample; not a live listing or quote.'),
  ('demo-product-02', 'Demo canvas pouch', 'Sample Seoul Store', 'Accessories', 18000, 'Fictional sample; availability and shipping are not verified.'),
  ('demo-product-03', 'Demo desk calendar', 'Sample Paper Shop', 'Home & office', 9000, 'Fictional sample; price is illustrative only.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  merchant = EXCLUDED.merchant,
  category = EXCLUDED.category,
  price_krw = EXCLUDED.price_krw,
  note = EXCLUDED.note,
  is_demo = TRUE;

INSERT INTO public.demo_customers (id, display_name, destination_country)
VALUES
  ('demo-customer-01', 'Demo Customer A', 'United States'),
  ('demo-customer-02', 'Demo Customer B', 'Japan'),
  ('demo-customer-03', 'Demo Customer C', 'Canada')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  destination_country = EXCLUDED.destination_country,
  is_demo = TRUE;

INSERT INTO public.demo_shipments (id, customer_id, product_id, status, carrier_label, tracking_label)
VALUES
  ('demo-shipment-01', 'demo-customer-01', 'demo-product-01', 'REQUEST_RECEIVED', 'Sample carrier', 'SAMPLE_ONLY'),
  ('demo-shipment-02', 'demo-customer-02', 'demo-product-02', 'PURCHASING', 'Sample carrier', 'SAMPLE_ONLY'),
  ('demo-shipment-03', 'demo-customer-03', 'demo-product-03', 'IN_TRANSIT', 'Sample carrier', 'SAMPLE_ONLY')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  product_id = EXCLUDED.product_id,
  status = EXCLUDED.status,
  carrier_label = EXCLUDED.carrier_label,
  tracking_label = EXCLUDED.tracking_label,
  is_demo = TRUE;

COMMIT;
