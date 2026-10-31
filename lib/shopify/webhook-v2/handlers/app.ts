/**
 * PayNShip v2.1 — App lifecycle webhook handlers
 *
 * app/uninstalled: 앱이 제거됨 → 토큰 무효화 + 운영자 알림.
 */

import logger from '@/lib/utils/logger';

export interface AppUninstalledPayload {
  id?: number;
  name?: string;
  domain?: string;
  myshopify_domain?: string;
}

/**
 * app/uninstalled handler.
 *
 * MVP: 치명적 이벤트 로그.
 * 향후:
 *  - .env의 ADMIN_ACCESS_TOKEN_V2 무효화 (Redis flag)
 *  - Slack 알림 (운영자 즉시 조치 필요)
 *  - 활성 주문/task 중단 처리
 */
export async function handleAppUninstalled(payload: AppUninstalledPayload): Promise<void> {
  logger.error(
    'WebhookV2App',
    `🚨 APP UNINSTALLED — shop=${payload.myshopify_domain ?? payload.domain ?? 'unknown'} ` +
      `name=${payload.name ?? ''}. Admin token is no longer valid. ` +
      `Operator action required: re-install app or migrate to new store.`,
  );
  // TODO:
  //  - Slack webhook으로 알림 (SLACK_OPS_WEBHOOK_URL)
  //  - In-memory flag 설정해서 Shopify API 호출 전부 차단
}
