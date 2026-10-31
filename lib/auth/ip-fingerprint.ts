/**
 * PayNShip v2.1 — IP fingerprint (cookie 삭제 우회 방지)
 *
 * 쿠키 기반 session_count를 고객이 지우면 무한 bypass 가능.
 * 이를 방지하기 위해 IP + UA hash를 서버(Redis)에 저장해 세션 카운트 역참조.
 *
 * 주의: 개인정보 보호를 위해 hash는 salted, 결과는 역추적 불가.
 */

import crypto from 'crypto';

function getSalt(): string {
  // SESSION_SECRET 이미 존재 (app/dev-login에서도 쓰임)
  return process.env.SESSION_SECRET ?? 'paynship-v2-default-salt-change-me';
}

/**
 * IP + UA → 16자 hash.
 * 동일 방문자 재식별용. 역매핑 불가 (일방향).
 */
export function computeFingerprint(ip: string, userAgent: string): string {
  const salt = getSalt();
  const input = `${salt}|${ip}|${userAgent}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * Request에서 IP 추출 (middleware에서 호출).
 */
export function extractIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function extractUa(req: Request): string {
  return req.headers.get('user-agent')?.substring(0, 200) ?? 'unknown';
}
