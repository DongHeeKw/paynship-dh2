import { isLaunchDestination } from './countries';
import { PurchaseError } from './errors';

export function requireLaunchDestination(country: string) {
  if (!isLaunchDestination(country)) throw new PurchaseError(422, 'New requests are limited to Vietnam, Thailand, the Philippines, Indonesia, China, Japan and the United States. Shipping eligibility still requires review.');
}
