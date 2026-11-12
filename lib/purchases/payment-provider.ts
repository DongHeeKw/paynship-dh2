import type { PurchaseQuote } from './quote';
import type { DeliveryProfile } from './schemas';
import { PurchaseError } from './errors';

export function paymentProviderConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? '';
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? '';
  const version = process.env.SHOPIFY_API_VERSION ?? '2026-07';
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) || !token || !process.env.SHOPIFY_WEBHOOK_SECRET || !/^\d{4}-(01|04|07|10)$/.test(version)) {
    throw new PurchaseError(503, 'Hosted payment and its verified webhook are not configured.');
  }
  return { domain, token, version };
}

export async function createHostedPayment(requestId: string, quote: PurchaseQuote, email: string, delivery: DeliveryProfile) {
  const { domain, token, version } = paymentProviderConfig();
  const lineItems = [
    [quote.productName, quote.productCents], ['Domestic shipping', quote.domesticShippingCents],
    ['Purchasing service fee', quote.serviceFeeCents], ['International shipping', quote.internationalShippingCents],
    ['Insurance', quote.insuranceCents], ['Import duty deposit', quote.dutyCents], ['Destination tax deposit', quote.taxCents],
    ['Customs clearance', quote.clearanceCents ?? 0],
  ].filter(([, cents]) => Number(cents) > 0).map(([title, cents]) => ({ title, quantity: 1, requiresShipping: false, taxable: false,
    originalUnitPriceWithCurrency: { amount: (Number(cents) / 100).toFixed(2), currencyCode: 'USD' } }));
  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: `mutation PurchasePayment($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) { userErrors { message } draftOrder { id invoiceUrl totalPriceSet { presentmentMoney { amount currencyCode } } } }
    }`, variables: { input: { email, presentmentCurrencyCode: 'USD', acceptAutomaticDiscounts: false, allowDiscountCodesInCheckout: false,
      useCustomerDefaultAddress: false, lineItems, tags: ['paynship-reviewed-purchase'],
      customAttributes: [{ key: 'purchase_request_id', value: requestId }, { key: 'purchase_quote_version', value: String(quote.quoteVersion) }],
      shippingAddress: { firstName: delivery.fullName, address1: delivery.address1, address2: delivery.address2, city: delivery.city,
        province: delivery.region, zip: delivery.postalCode, countryCode: delivery.country, phone: delivery.phone } } } }),
  });
  if (!response.ok) throw new PurchaseError(503, 'Payment provider did not confirm the checkout. Contact support.');
  const payload = await response.json();
  const draft = payload.data?.draftOrderCreate?.draftOrder;
  const money = draft?.totalPriceSet?.presentmentMoney;
  if (payload.errors?.length || payload.data?.draftOrderCreate?.userErrors?.length || !draft?.id || !draft.invoiceUrl || money?.currencyCode !== 'USD' || Math.round(Number(money.amount) * 100) !== quote.totalCents) {
    throw new PurchaseError(503, 'Payment provider total did not match the approved quote. Contact support.');
  }
  const url = new URL(draft.invoiceUrl);
  if (url.protocol !== 'https:' || ![domain, 'checkout.shopify.com'].includes(url.hostname)) {
    throw new PurchaseError(503, 'Payment provider returned an unexpected checkout address.');
  }
  return { id: String(draft.id), checkoutUrl: url.toString() };
}
