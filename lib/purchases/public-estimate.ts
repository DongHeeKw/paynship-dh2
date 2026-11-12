import { z } from 'zod';
import published from '@/data/catalog/public-prices.json';
import { validateProductUrl } from './product-url';
import { calculateServiceFeeKrw } from './service-fee';

export const LAUNCH_DESTINATIONS = ['US', 'CN', 'JP'] as const;
const won = z.number().int().nonnegative().max(1_000_000_000);
const source = z.string().max(2048).url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; });
const evidence = z.object({ reference: source, verifiedAt: z.string().datetime(), expiresAt: z.string().datetime() }).strict();
const productSchema = z.object({
  sourceUrl: source.refine(value => { try { return validateProductUrl(value) === value; } catch { return false; } }),
  sku: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(200),
  // Exact requested options, including an explicit "No variants" for single-option products.
  options: z.string().trim().min(1).max(500),
  size: z.string().min(1).max(100).nullable(), color: z.string().min(1).max(100).nullable(), model: z.string().min(1).max(100).nullable(),
  unitPriceKrw: won.refine(value => value > 0 && value <= 100_000_000),
  productEvidence: evidence,
  routes: z.array(z.object({
    destination: z.enum(LAUNCH_DESTINATIONS), quantity: z.number().int().min(1).max(10),
    domesticShippingKrw: won, internationalShippingKrw: won, insuranceKrw: won,
    dutyKrw: won, taxKrw: won, clearanceKrw: won,
    origin: z.string().regex(/^[A-Z]{2}$/), hsCode: z.string().regex(/^\d{6,12}$/),
    material: z.string().min(2).max(300),
    packagedWeightGrams: z.number().int().positive().max(100_000),
    packagedDimensionsMm: z.tuple([z.number().int().positive().max(3000), z.number().int().positive().max(3000), z.number().int().positive().max(3000)]),
    carrier: z.string().min(2).max(100), importRegime: z.string().min(3).max(200),
    // Whole-shipment, broker/carrier reviewed amounts for this exact SKU, destination and quantity.
    freightEvidence: evidence, customsEvidence: evidence,
  }).strict()).max(30),
}).strict();

export const publicPriceCatalogSchema = z.object({ version: z.literal(1), products: z.array(productSchema).max(500) }).strict();
export type PublicPriceCatalog = z.infer<typeof publicPriceCatalogSchema>;
export type PublishedProduct = PublicPriceCatalog['products'][number];
const parsedCatalog = publicPriceCatalogSchema.safeParse(published);
export const PUBLIC_PRICE_CATALOG: PublicPriceCatalog = parsedCatalog.success ? parsedCatalog.data : { version: 1, products: [] };

function current(record: z.infer<typeof evidence>, now: number) {
  const verified = Date.parse(record.verifiedAt), expires = Date.parse(record.expiresAt);
  return Number.isFinite(now) && verified <= now && now - verified < 86400000 && expires > now && expires <= verified + 86400000;
}

export function publishedOptions(sourceUrl: string, catalog = PUBLIC_PRICE_CATALOG): PublishedProduct[] {
  try { const canonical = validateProductUrl(sourceUrl); return catalog.products.filter(item => item.sourceUrl === canonical); } catch { return []; }
}

export function publicCostEstimate(input: { sourceUrl: string; options: string; destination: string; quantity: number; enteredUnitPriceKrw?: number }, now = Date.now(), catalog = PUBLIC_PRICE_CATALOG) {
  const result = { priceSource: 'UNKNOWN' as 'UNKNOWN' | 'CUSTOMER' | 'VERIFIED', productSubtotalKrw: null as number | null, serviceFeeKrw: null as number | null,
    productAndServiceKrw: null as number | null, domesticShippingKrw: null as number | null, internationalShippingKrw: null as number | null,
    insuranceKrw: null as number | null, dutyKrw: null as number | null, taxKrw: null as number | null, clearanceKrw: null as number | null,
    totalKrw: null as number | null, expiresAt: null as string | null, reason: 'Product price and selected options need verification.' };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) return { ...result, reason: 'Choose a quantity from 1 to 10.' };
  const matching = publishedOptions(input.sourceUrl, catalog).filter(item => item.options === input.options);
  const product = matching.length === 1 && current(matching[0].productEvidence, now) ? matching[0] : undefined;
  const entered = input.enteredUnitPriceKrw;
  const unitPrice = product?.unitPriceKrw ?? (Number.isSafeInteger(entered) && entered! > 0 && entered! <= 100_000_000 ? entered : undefined);
  if (unitPrice === undefined) return result;
  result.priceSource = product ? 'VERIFIED' : 'CUSTOMER';
  result.productSubtotalKrw = unitPrice * input.quantity;
  result.serviceFeeKrw = calculateServiceFeeKrw(result.productSubtotalKrw);
  result.productAndServiceKrw = result.productSubtotalKrw + result.serviceFeeKrw;
  result.reason = 'Shipping, insurance, import charges and clearance need review. This is not the delivered total.';
  if (!LAUNCH_DESTINATIONS.some(country => country === input.destination)) return { ...result, reason: 'Our launch routes are the USA, China and Japan. Other destinations need a separate review.' };
  if (!product) return result;
  const routes = product.routes.filter(route => route.destination === input.destination && route.quantity === input.quantity);
  if (routes.length !== 1 || !current(routes[0].freightEvidence, now) || !current(routes[0].customsEvidence, now)) return result;
  const route = routes[0];
  result.domesticShippingKrw = route.domesticShippingKrw;
  result.internationalShippingKrw = route.internationalShippingKrw;
  result.insuranceKrw = route.insuranceKrw;
  result.dutyKrw = route.dutyKrw;
  result.taxKrw = route.taxKrw;
  result.clearanceKrw = route.clearanceKrw;
  result.totalKrw = result.productAndServiceKrw + route.domesticShippingKrw + route.internationalShippingKrw + route.insuranceKrw + route.dutyKrw + route.taxKrw + route.clearanceKrw;
  result.expiresAt = new Date(Math.min(...[product.productEvidence, route.freightEvidence, route.customsEvidence].map(item => Date.parse(item.expiresAt)))).toISOString();
  result.reason = 'Reviewed estimate for these exact options and quantity. Your delivery address and final quote are checked before payment.';
  return result;
}
