/**
 * DEV ONLY — 테스트용 환율 DB insert (Presentment 8 통화)
 * 실제 운영에서는 /api/cron/exchange-rate-usd-daily (Shinhan→KEXIM chain) 사용.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// USD base — 1 USD = X target
const TEST_USD_RATES: Record<string, number> = {
  JPY: 155.8,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.52,
  SGD: 1.34,
  CNY: 7.25,
  KRW: 1350,
};

// KRW base — 1 CCY = X KRW (신한 매매기준율 형식)
const TEST_KRW_RATES: Record<string, number> = {
  USD: 1350,
  JPY: 1350 / 155.8,
  EUR: 1350 / 0.92,
  GBP: 1350 / 0.79,
  CAD: 1350 / 1.37,
  AUD: 1350 / 1.52,
  SGD: 1350 / 1.34,
  CNY: 1350 / 7.25,
};

async function main() {
  const now = new Date();
  const expires = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const usdRows = Object.entries(TEST_USD_RATES).map(([code, rate]) => ({
    currencyCode: code,
    baseCurrency: 'USD',
    shinhanRate: rate,
    adminAdjustment: 0,
    effectiveRate: rate,
    capturedAt: now,
    expiresAt: expires,
    source: 'SHINHAN_BANK_10AM',
  }));

  const krwRows = Object.entries(TEST_KRW_RATES).map(([code, rate]) => ({
    currencyCode: code,
    baseCurrency: 'KRW',
    shinhanRate: rate,
    adminAdjustment: 0,
    effectiveRate: rate,
    capturedAt: now,
    expiresAt: expires,
    source: 'SHINHAN_BANK_10AM',
  }));

  const result = await prisma.exchangeRate.createMany({ data: [...usdRows, ...krwRows] });
  console.log(`✓ ${result.count}개 테스트 환율 저장 (USD ${usdRows.length} + KRW ${krwRows.length}, expires ${expires.toISOString()})`);
}

main().finally(() => prisma.$disconnect());
