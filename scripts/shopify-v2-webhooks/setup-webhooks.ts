/**
 * PayNShip v2.1 — Webhook 설정 스크립트
 *
 * 실행:
 *   # Dry run (현재 상태만 조회)
 *   npx tsx scripts/shopify-v2-webhooks/setup-webhooks.ts
 *
 *   # Apply (실제 등록/삭제)
 *   npx tsx scripts/shopify-v2-webhooks/setup-webhooks.ts \
 *     --apply --url=https://paynship.kr/api/webhooks/shopify-v2
 *
 *   # 로컬 개발 (ngrok URL)
 *   npx tsx scripts/shopify-v2-webhooks/setup-webhooks.ts \
 *     --apply --url=https://abc123.ngrok.io/api/webhooks/shopify-v2
 *
 * 전략:
 *  - 기존 V21_WEBHOOK_TOPICS에 등록된 구독 있으면 유지 (callback URL 일치 시)
 *  - callback URL이 다르면 삭제 + 재등록
 *  - 미등록 topic은 신규 등록
 */

import 'dotenv/config';
import {
  V21_WEBHOOK_TOPICS,
  listSubscriptions,
  createSubscription,
  deleteSubscription,
  type V21WebhookTopic,
} from '../../lib/shopify/webhook-v2/register';

const APPLY = process.argv.includes('--apply');
const URL_ARG = process.argv.find(a => a.startsWith('--url='))?.slice('--url='.length);

function logStep(s: string) {
  console.log(`\n\x1b[36m▶ ${s}\x1b[0m`);
}
function logOk(s: string) {
  console.log(`\x1b[32m  ✓ ${s}\x1b[0m`);
}
function logWarn(s: string) {
  console.log(`\x1b[33m  ⚠ ${s}\x1b[0m`);
}
function logErr(s: string) {
  console.log(`\x1b[31m  ✗ ${s}\x1b[0m`);
}

async function main() {
  console.log('━━━ PayNShip v2.1 Webhooks Setup ━━━');
  console.log(`Shop: ${process.env.SHOPIFY_STORE_DOMAIN_V2}`);
  console.log(`Mode: ${APPLY ? '\x1b[31mAPPLY\x1b[0m' : '\x1b[33mDRY RUN\x1b[0m'}`);

  if (APPLY && !URL_ARG) {
    logErr('--apply 모드는 --url=<callback-url> 필수');
    process.exit(1);
  }

  const callbackUrl = URL_ARG ?? 'https://example.com/api/webhooks/shopify-v2';

  // 1. 현재 상태 조회
  logStep('현재 Webhook Subscriptions 조회');
  const existing = await listSubscriptions();
  console.log(`  ${existing.length}개 발견:`);
  for (const s of existing) {
    const url = (s.endpoint as any).callbackUrl ?? '(non-http)';
    console.log(`    - [${s.topic}] ${url}`);
  }

  // 2. V21 topic별 필요 처리 판정
  logStep(`v2.1 Target callback URL: ${callbackUrl}`);

  const actions: Array<{
    topic: V21WebhookTopic;
    action: 'keep' | 'create' | 'replace';
    existingId?: string;
  }> = [];

  for (const topic of V21_WEBHOOK_TOPICS) {
    const matches = existing.filter(e => e.topic === topic);

    if (matches.length === 0) {
      actions.push({ topic, action: 'create' });
    } else {
      const sameUrl = matches.find(m => (m.endpoint as any).callbackUrl === callbackUrl);
      if (sameUrl) {
        actions.push({ topic, action: 'keep', existingId: sameUrl.id });
      } else {
        // 다른 URL로 등록된 것 있음 → 삭제 후 새로 생성
        actions.push({ topic, action: 'replace', existingId: matches[0].id });
      }
    }
  }

  // 3. 요약
  logStep('계획');
  for (const a of actions) {
    const label =
      a.action === 'keep' ? '\x1b[32mKEEP\x1b[0m' :
      a.action === 'create' ? '\x1b[34mCREATE\x1b[0m' :
      '\x1b[33mREPLACE\x1b[0m';
    console.log(`  ${label.padEnd(20)} ${a.topic}`);
  }

  if (!APPLY) {
    logWarn('DRY RUN — 실제 변경 없음. --apply --url=<URL> 로 실행하세요.');
    return;
  }

  // 4. 적용
  logStep('적용 중');
  for (const a of actions) {
    if (a.action === 'keep') continue;

    if (a.action === 'replace' && a.existingId) {
      await deleteSubscription(a.existingId);
      logOk(`deleted old subscription for ${a.topic}`);
    }

    const created = await createSubscription(a.topic, callbackUrl);
    logOk(`created ${a.topic} (${created.id})`);
  }

  logStep('최종 상태');
  const final = await listSubscriptions();
  for (const s of final.filter(e => V21_WEBHOOK_TOPICS.includes(e.topic as any))) {
    const url = (s.endpoint as any).callbackUrl ?? '(non-http)';
    console.log(`  - [${s.topic}] ${url}`);
  }

  logStep('중요: SHOPIFY_WEBHOOK_SECRET_V2');
  console.log('  이제 Shopify Partner Dashboard 에서 앱 설정 → "Webhooks" → ');
  console.log('  또는 Shopify Admin → Apps에서 webhook secret을 확인해 .env.local에 저장하세요.');
  console.log('  `SHOPIFY_WEBHOOK_SECRET_V2` 가 비어있으면 모든 webhook이 401 거부됩니다.');
}

main().catch(err => {
  console.error('\n\x1b[31m━━━ 오류 ━━━\x1b[0m');
  console.error(err);
  process.exit(1);
});
