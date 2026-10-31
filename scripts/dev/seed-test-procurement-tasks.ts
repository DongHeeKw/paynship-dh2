/**
 * DEV — 테스트용 ProcurementTask 생성
 *
 * 현재 로그인된 사용자 이메일을 찾아 여러 상태의 task를 생성.
 *   npx tsx scripts/dev/seed-test-procurement-tasks.ts <email>
 */

import 'dotenv/config';
import { PrismaClient, type ProcurementTaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

const STATES: Array<{ status: ProcurementTaskStatus; label: string }> = [
  { status: 'QUEUED', label: '결제 완료 직후' },
  { status: 'PROCUREMENT_IN_PROGRESS', label: '국내 주문 중' },
  { status: 'DOMESTIC_SHIPPING', label: '국내 배송 중' },
  { status: 'WAREHOUSED', label: '검수 단계' },
  { status: 'INTL_SHIPMENT_CREATED', label: '국제 배송 출발' },
  { status: 'CANCELLED', label: '취소된 주문' },
];

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/dev/seed-test-procurement-tasks.ts <email>');
    process.exit(1);
  }

  console.log(`Seeding ${STATES.length} test tasks for ${email}`);

  for (let i = 0; i < STATES.length; i++) {
    const s = STATES[i];
    const orderIdNum = 100000 + i;
    await prisma.procurementTask.create({
      data: {
        status: s.status,
        metadata: {
          shopifyOrderId: String(orderIdNum),
          shopifyOrderName: `#${orderIdNum}`,
          customerEmail: email,
          shippingCountry: ['US', 'JP', 'GB', 'DE', 'SG', 'CA'][i % 6],
          totalPrice: (20 + i * 15).toFixed(2),
          currencyCode: 'USD',
          lineItemCount: (i % 3) + 1,
          source: 'dev-seed',
          tags: `paynship-v2.1, test-${s.status}`,
          receivedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
    console.log(`  ✓ [${s.status}] ${s.label} — order #${orderIdNum}`);
  }

  console.log(`\n✓ ${STATES.length} tasks created. Visit /my-orders to see.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
