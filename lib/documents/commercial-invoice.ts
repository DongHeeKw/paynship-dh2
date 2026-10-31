/**
 * Commercial Invoice Generator
 *
 * Generates an HTML commercial invoice for customs declarations.
 * Operators can print-to-PDF from the browser — no heavy PDF library needed.
 */

import { getExchangeRateSync } from '@/lib/calculator/exchange-rate';
import { isRecord } from '@/lib/utils/type-guards';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitValueUsd: number;
  hsCode?: string;
  originCountry?: string;
}

export interface CommercialInvoiceData {
  invoiceNumber: string;
  invoiceDate: string; // ISO date string

  // Seller (PayNShip)
  sellerName: string;
  sellerAddress: string;
  sellerCountry: string;

  // Buyer / Ship-to
  buyerName: string;
  buyerAddress: string;
  buyerCountry: string;
  buyerEmail?: string;

  // Items
  items: InvoiceLineItem[];

  // Totals (USD)
  totalValueUsd: number;
  shippingCostUsd?: number;

  // Customs
  declarationType?: string; // e.g. "Gift", "Commercial Sample", "Sold"
  currency?: string; // default USD
}

function formatUsd(amount: number): string {
  return `USD ${amount.toFixed(2)}`;
}

function buildItemRows(items: InvoiceLineItem[]): string {
  return items
    .map(
      (item, i) => `
    <tr style="border-bottom:1px solid #e0e0e0;">
      <td style="padding:8px 4px;">${i + 1}</td>
      <td style="padding:8px 4px;">${escapeHtml(item.description)}</td>
      <td style="padding:8px 4px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 4px;text-align:right;">${formatUsd(item.unitValueUsd)}</td>
      <td style="padding:8px 4px;text-align:right;">${formatUsd(item.unitValueUsd * item.quantity)}</td>
      <td style="padding:8px 4px;text-align:center;">${escapeHtml(item.hsCode ?? '')}</td>
      <td style="padding:8px 4px;text-align:center;">${escapeHtml(item.originCountry ?? 'KR')}</td>
    </tr>`
    )
    .join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a commercial invoice as an HTML string.
 * Returns a full HTML document ready for browser print-to-PDF.
 */
export function generateCommercialInvoiceHtml(data: CommercialInvoiceData): string {
  const currency = data.currency ?? 'USD';
  const declarationType = data.declarationType ?? 'Sold';
  const grandTotal = data.totalValueUsd + (data.shippingCostUsd ?? 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Commercial Invoice — ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
    .meta { text-align: right; }
    .meta p { margin-bottom: 4px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .party-box { border: 1px solid #ccc; padding: 12px; }
    .party-box p { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead { background: #111; color: #fff; }
    thead th { padding: 10px 4px; text-align: left; font-weight: bold; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    .totals { text-align: right; margin-bottom: 24px; }
    .totals table { width: auto; margin-left: auto; }
    .totals td { padding: 4px 12px; }
    .totals .grand-total { font-weight: bold; border-top: 2px solid #111; }
    .declaration { border: 1px solid #ccc; padding: 16px; font-size: 12px; color: #555; margin-bottom: 24px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
    .sig-line { border-top: 1px solid #111; padding-top: 4px; font-size: 12px; }
    @media print {
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>COMMERCIAL INVOICE</h1>
      <p>for Customs Declaration</p>
    </div>
    <div class="meta">
      <p><strong>Invoice #:</strong> ${escapeHtml(data.invoiceNumber)}</p>
      <p><strong>Date:</strong> ${escapeHtml(data.invoiceDate)}</p>
      <p><strong>Declaration Type:</strong> ${escapeHtml(declarationType)}</p>
      <p><strong>Currency:</strong> ${escapeHtml(currency)}</p>
    </div>
  </div>

  <div class="party-grid">
    <div class="party-box">
      <h2>Seller / Exporter</h2>
      <p><strong>${escapeHtml(data.sellerName)}</strong></p>
      <p>${escapeHtml(data.sellerAddress)}</p>
      <p>${escapeHtml(data.sellerCountry)}</p>
    </div>
    <div class="party-box">
      <h2>Buyer / Consignee</h2>
      <p><strong>${escapeHtml(data.buyerName)}</strong></p>
      <p>${escapeHtml(data.buyerAddress)}</p>
      <p>${escapeHtml(data.buyerCountry)}</p>
      ${data.buyerEmail ? `<p>${escapeHtml(data.buyerEmail)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description of Goods</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Value</th>
        <th style="text-align:right">Total Value</th>
        <th style="text-align:center">HS Code</th>
        <th style="text-align:center">Origin</th>
      </tr>
    </thead>
    <tbody>
      ${buildItemRows(data.items)}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Goods Value:</td>
        <td>${formatUsd(data.totalValueUsd)}</td>
      </tr>
      ${
        data.shippingCostUsd != null
          ? `<tr><td>Shipping Cost:</td><td>${formatUsd(data.shippingCostUsd)}</td></tr>`
          : ''
      }
      <tr class="grand-total">
        <td>Grand Total:</td>
        <td>${formatUsd(grandTotal)}</td>
      </tr>
    </table>
  </div>

  <div class="declaration">
    <strong>Declaration:</strong> I hereby certify that the information on this invoice is true and correct
    and that the contents and value of this shipment are as stated above.
    Country of origin of goods: Republic of Korea (KR).
  </div>

  <div class="signatures">
    <div>
      <div class="sig-line">Authorized Signature &amp; Date</div>
    </div>
    <div>
      <div class="sig-line">Company Stamp (if applicable)</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build InvoiceLineItems from an order's cart snapshot JSON.
 */
export function buildLineItemsFromCartSnapshot(
  cartSnapshot: unknown,
  defaultHsCode?: string,
  exchangeRate?: number
): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];
  const rate = exchangeRate ?? getExchangeRateSync();

  const rows: unknown[] = Array.isArray(cartSnapshot)
    ? cartSnapshot
    : isRecord(cartSnapshot) && Array.isArray(cartSnapshot.items)
      ? (cartSnapshot.items as unknown[])
      : [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = typeof row.name === 'string' ? row.name : 'Korean Product';
    const priceKrw = typeof row.priceKrw === 'number' ? row.priceKrw : 0;
    const qty = typeof row.quantity === 'number' ? row.quantity : 1;
    const unitValueUsd = Math.round((priceKrw / rate) * 100) / 100;

    items.push({
      description: name,
      quantity: qty,
      unitValueUsd,
      hsCode: defaultHsCode,
      originCountry: 'KR',
    });
  }

  // Ensure at least one line item
  if (items.length === 0) {
    items.push({
      description: 'Korean Product',
      quantity: 1,
      unitValueUsd: 0,
      hsCode: defaultHsCode,
      originCountry: 'KR',
    });
  }

  return items;
}

