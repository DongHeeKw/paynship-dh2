import { PurchaseError } from './errors';
import { productUrl } from '@/lib/product-evidence/product-url.mjs';

export function validateProductUrl(input: string): string {
  try {
    return productUrl(input).href;
  } catch {
    throw new PurchaseError(400, 'Enter a supported HTTPS product URL without credentials or a custom port.');
  }
}
