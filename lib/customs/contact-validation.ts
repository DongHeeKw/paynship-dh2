import { z } from 'zod';

// Shipping-contact shape only: no OTP, subscriber lookup, or ownership claim.
export const internationalPhoneSchema = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Use + followed by country code and 7–15 digits, without spaces.');
export function singleLineText(min: number, max: number) {
  return z.string().trim().min(min).max(max).refine(value => !/[\u0000-\u001f\u007f-\u009f]/.test(value), 'Use a single line without control characters.');
}
