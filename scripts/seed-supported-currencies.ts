/**
 * PayNShip — SupportedCurrency seed 스크립트 (v2.2 = v2.0 only)
 *
 * Presentment 8 통화 (USD/JPY/EUR/GBP/CAD/AUD/SGD/CNY) upsert.
 * 이전 v2.1 37개 통화는 active=false 처리 (soft delete).
 *
 * 실행:
 *   npx tsx scripts/seed-supported-currencies.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  V21_SUPPORTED_CURRENCIES,
  V21_CURRENCY_CODES,
} from '../lib/exchange-rate/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━ SupportedCurrency seed (v2.2 Presentment 8) ━━━');
  console.log(`Active 통화: ${V21_SUPPORTED_CURRENCIES.length}개 (${V21_CURRENCY_CODES.join(', ')})`);

  let created = 0;
  let updated = 0;

  for (const cur of V21_SUPPORTED_CURRENCIES) {
    const existing = await prisma.supportedCurrency.findUnique({
      where: { code: cur.code },
    });

    await prisma.supportedCurrency.upsert({
      where: { code: cur.code },
      create: {
        code: cur.code,
        displayName: cur.displayName,
        symbol: cur.symbol,
        active: true,
        defaultForCountry: cur.defaultForCountry,
        sortOrder: cur.sortOrder,
      },
      update: {
        displayName: cur.displayName,
        symbol: cur.symbol,
        active: true,
        defaultForCountry: cur.defaultForCountry,
        sortOrder: cur.sortOrder,
      },
    });

    if (existing) updated++;
    else created++;
  }

  // Presentment 8 외 통화는 비활성화 (soft delete) — v2.0 안 정렬
  const deactivated = await prisma.supportedCurrency.updateMany({
    where: { code: { notIn: V21_CURRENCY_CODES }, active: true },
    data: { active: false },
  });

  console.log(`✓ 생성: ${created}개`);
  console.log(`✓ 업데이트: ${updated}개`);
  console.log(`✓ 비활성화 (8개 외): ${deactivated.count}개`);
  console.log(`━━━ 완료 ━━━`);
}

main()
  .catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
