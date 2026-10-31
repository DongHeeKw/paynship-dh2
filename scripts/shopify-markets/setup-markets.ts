/**
 * PayNShip v2.1 — Shopify Markets 설정 스크립트
 *
 * 전략 (Basic 플랜 3 market 한도):
 *  - Market 1: 대한민국 (KR, primary)  ← 기존 유지
 *  - Market 2: International (53개 ISO 코드)  ← 기존 "미국 및 캐나다" 확장/개명
 *  - Market 3: (예약, 현재 미사용)
 *
 * Presentment currency:
 *  - Basic 플랜은 Shopify Payments 없이 presentment 통화 세팅 불가
 *  - Shopify Checkout은 shop currency(USD)로만 결제 진행
 *  - 고객 표시 통화는 Next.js 프론트에서 자체 환율 시스템으로 처리
 *    (yohan-docs/v2.1/dev/06_CURRENCY_CONVERSION.md)
 *
 * 실행:
 *   npx tsx scripts/shopify-markets/setup-markets.ts            # dry run
 *   npx tsx scripts/shopify-markets/setup-markets.ts --apply    # 실제 적용
 */

import 'dotenv/config';
import { COUNTRIES, ISO_CODES, MARKET_STRATEGY } from './countries';

const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN_V2 || 'ehj0yx-zs.myshopify.com';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN_V2 || '';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';

if (!ADMIN_TOKEN) {
  console.error('❌ SHOPIFY_ADMIN_ACCESS_TOKEN_V2 env 필수');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

interface GqlResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
  extensions?: any;
}

async function gql<T = any>(query: string, variables: Record<string, any> = {}): Promise<GqlResponse<T>> {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ─── Current state 조회 ──────────────────────────────────────
const LIST_MARKETS_QUERY = `
  query {
    markets(first: 20) {
      edges {
        node {
          id
          name
          handle
          type
          status
          conditions {
            regionsCondition {
              regions(first: 100) {
                edges {
                  node {
                    ... on MarketRegionCountry {
                      id
                      code
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────────
const UPDATE_MARKET_MUTATION = `
  mutation UpdateMarket($id: ID!, $input: MarketUpdateInput!) {
    marketUpdate(id: $id, input: $input) {
      market {
        id
        name
        handle
        conditions {
          regionsCondition {
            regions(first: 100) {
              edges {
                node {
                  ... on MarketRegionCountry {
                    code
                    name
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// ─── Helpers ────────────────────────────────────────────────
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

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log('━━━ PayNShip Shopify Markets Setup ━━━');
  console.log(`Shop: ${SHOP_DOMAIN}`);
  console.log(`API:  ${API_VERSION}`);
  console.log(`Mode: ${APPLY ? '\x1b[31mAPPLY (실제 적용)\x1b[0m' : '\x1b[33mDRY RUN (조회만)\x1b[0m'}`);

  // 1) 현재 상태 조회
  logStep('현재 Markets 조회');
  const listRes = await gql(LIST_MARKETS_QUERY);
  if (listRes.errors?.length) {
    logErr(`조회 실패: ${JSON.stringify(listRes.errors)}`);
    process.exit(1);
  }

  const markets = listRes.data.markets.edges.map((e: any) => e.node);
  console.log(`  총 ${markets.length}개 Market 발견:`);
  for (const m of markets) {
    const regions = m.conditions?.regionsCondition?.regions?.edges?.map((r: any) => r.node.code).filter(Boolean) || [];
    console.log(`    - ${m.name} [${m.handle}] (${m.status}, ${m.type}): [${regions.join(', ')}]`);
  }

  // 2) Target market 결정
  //    - KR primary 제외한 "international" 용도의 Market 하나 선택
  const krMarket = markets.find((m: any) => m.handle === 'kr');
  const targetMarket = markets.find((m: any) => m.handle !== 'kr');

  if (!krMarket) {
    logErr('KR primary market 없음. 수동 확인 필요.');
    process.exit(1);
  }

  if (!targetMarket) {
    logErr('International 후보 market 없음. 새로 marketCreate 필요.');
    process.exit(1);
  }

  logStep(`International market으로 업데이트 대상: ${targetMarket.name} [${targetMarket.handle}]`);

  // 3) 현재 regions 확인 + diff 계산
  const currentRegions: string[] = targetMarket.conditions?.regionsCondition?.regions?.edges?.map((r: any) => r.node.code).filter(Boolean) || [];
  const desiredRegions = ISO_CODES; // 53개

  const toAdd = desiredRegions.filter(c => !currentRegions.includes(c));
  const toKeep = desiredRegions.filter(c => currentRegions.includes(c));
  const toRemove = currentRegions.filter(c => !desiredRegions.includes(c));

  console.log(`  현재:   ${currentRegions.length}개 [${currentRegions.sort().join(', ')}]`);
  console.log(`  목표:   ${desiredRegions.length}개 ISO 코드`);
  console.log(`  추가:   ${toAdd.length}개 [${toAdd.join(', ')}]`);
  console.log(`  유지:   ${toKeep.length}개 [${toKeep.join(', ')}]`);
  console.log(`  제거:   ${toRemove.length}개 [${toRemove.join(', ')}]`);

  if (!APPLY) {
    logWarn('DRY RUN — 실제 변경 없음. --apply 플래그로 실행하세요.');
    console.log('\n변경 미리보기:');
    console.log(`  Market 이름: "${targetMarket.name}" → "International"`);
    console.log(`  Handle: "${targetMarket.handle}" → "international"`);
    console.log(`  Regions: ${currentRegions.length}개 → ${desiredRegions.length}개`);
    return;
  }

  // 4) Apply: marketUpdate 실행
  logStep('Market 업데이트 실행');

  const updateInput: any = {
    name: 'International',
    handle: 'international',
    conditions: {
      conditionsToAdd: toAdd.length
        ? {
            regionsCondition: {
              regions: toAdd.map(code => ({ countryCode: code })),
            },
          }
        : undefined,
      // toRemove 있으면 별도 처리 필요 (regionIds 요구)
    },
  };

  // conditionsToDelete 정리 (현재 없으면 skip)
  if (toRemove.length) {
    const regionsToRemoveIds = targetMarket.conditions.regionsCondition.regions.edges
      .filter((r: any) => toRemove.includes(r.node.code))
      .map((r: any) => r.node.id);
    updateInput.conditions.conditionsToDelete = {
      regionsCondition: { regionIds: regionsToRemoveIds },
    };
  }

  const updateRes = await gql(UPDATE_MARKET_MUTATION, {
    id: targetMarket.id,
    input: updateInput,
  });

  if (updateRes.errors?.length) {
    logErr(`mutation 실패: ${JSON.stringify(updateRes.errors, null, 2)}`);
    process.exit(1);
  }

  const userErrors = updateRes.data.marketUpdate.userErrors;
  if (userErrors?.length) {
    logErr(`userErrors:`);
    for (const err of userErrors) {
      console.log(`    - ${err.field?.join('.')} : ${err.message} (${err.code})`);
    }
    process.exit(1);
  }

  const updated = updateRes.data.marketUpdate.market;
  const finalRegions = updated.conditions.regionsCondition.regions.edges.map((r: any) => r.node.code).filter(Boolean);
  logOk(`업데이트 완료: "${updated.name}" [${updated.handle}] — ${finalRegions.length}개 regions`);

  // 5) 검증
  logStep('검증');
  const missing = desiredRegions.filter(c => !finalRegions.includes(c));
  const extra = finalRegions.filter((c: string) => !desiredRegions.includes(c));

  if (missing.length === 0 && extra.length === 0) {
    logOk(`완벽! ${desiredRegions.length}개 ISO 코드 모두 매핑됨.`);
  } else {
    if (missing.length) logWarn(`누락: ${missing.join(', ')}`);
    if (extra.length) logWarn(`여분: ${extra.join(', ')}`);
  }
}

main().catch(err => {
  console.error('\n\x1b[31m━━━ 오류 ━━━\x1b[0m');
  console.error(err);
  process.exit(1);
});
