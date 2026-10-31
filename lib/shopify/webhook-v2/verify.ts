/**
 * PayNShip v2.1 — Shopify Webhook HMAC 검증
 *
 * Shopify는 webhook 전송 시 body를 SHA256-HMAC으로 서명하고
 * `X-Shopify-Hmac-Sha256` 헤더에 base64로 담는다.
 *
 * 검증 실패 = 위조된 요청 → 401 응답.
 *
 * 중요: raw body 문자열 기반 검증. JSON.parse 전에 verify 필요.
 */

import crypto from 'crypto';

/**
 * HMAC 검증 결과.
 */
export interface VerifyResult {
  valid: boolean;
  reason?: 'missing_secret' | 'missing_header' | 'hmac_mismatch';
}

/**
 * raw body + hmac header → 검증 결과 반환.
 * 반드시 raw body (request.text() 결과 string)를 전달해야 함.
 */
export function verifyShopifyWebhookV2(rawBody: string, hmacHeader: string | null | undefined): VerifyResult {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET_V2;

  if (!secret) {
    return { valid: false, reason: 'missing_secret' };
  }

  if (!hmacHeader) {
    return { valid: false, reason: 'missing_header' };
  }

  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  // timing-safe 비교
  const headerBuf = Buffer.from(hmacHeader);
  const computedBuf = Buffer.from(computed);

  if (headerBuf.length !== computedBuf.length) {
    return { valid: false, reason: 'hmac_mismatch' };
  }

  const match = crypto.timingSafeEqual(headerBuf, computedBuf);
  return match ? { valid: true } : { valid: false, reason: 'hmac_mismatch' };
}
