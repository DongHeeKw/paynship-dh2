# Catalog ID Strategy & AI Matching (v2.0)

> **Date**: 2026-04-19
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

같은 상품이 여러 쇼핑몰 URL로 등장한다. 쿠팡·네이버·11번가·브랜드 공식 홈페이지 각각이 다른 URL·이미지·표기를 갖는다. 고객 스크레이핑마다 새 Product 레코드를 만들면 중복이 누적되고, 최저가 비교·운영자 관리가 어렵다. **URL 기반 상품 식별(Product ID)**과 **의미 기반 상품 그룹(Catalog ID)**을 분리해야 한다.

---

## Decision

### 이중 식별 체계

| 식별자 | 정의 | 채번 |
|--------|------|------|
| **Product ID** | 1 URL = 1 Product | `sourceUrlHash` (MD5 of normalized URL) |
| **Catalog ID** | 같은 상품의 모든 URL 그룹 | `normalize(brand + productName + sku)` SHA256 12자 |
| **shopifyProductId** | Shopify 실물 상품 (Cart-add 시 생성) | Shopify GID |

### Catalog ID 생성 공식

```ts
function computeCatalogId(brand: string, productName: string, sku: string): string {
  const canonical = [
    brand.toLowerCase().trim().replace(/\s+/g, ' '),
    productName.toLowerCase().trim().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, ' '),
    sku.toLowerCase().trim()
  ].join('|');
  return sha256(canonical).slice(0, 12);
}
```

- `brand` 또는 `sku` 누락 시 → `Catalog ID` null로 유지, 매칭 큐로 회부
- 모든 스크레이핑 결과는 Product에 저장 + Catalog에 mirror된 대표 필드 저장

### AI 자동 매칭 + 운영자 큐

```
Product 신규 생성 (스크레이핑 완료)
   │
   ▼
Catalog ID 계산 가능?  
   ├─ Yes → 동일 CatalogID 레코드 존재?
   │       ├─ Yes → CatalogEntry에 이 Product 연결
   │       └─ No  → CatalogEntry 신규 생성 (대표 값 = 이 Product)
   │
   └─ No  → Fuzzy 매칭 시도 (LLM + embedding)
           │
           ├─ confidence ≥ 0.85 → 자동 연결
           ├─ 0.60 ≤ confidence < 0.85 → **매칭 필요 큐** 에 회부
           └─ confidence < 0.60 → CatalogEntry 신규 생성 (unmatched)
```

### 임계치 (Admin Settings 조정 가능)

- `CATALOG_AUTO_MATCH_THRESHOLD` = 0.85 (default)
- `CATALOG_MANUAL_QUEUE_MIN` = 0.60 (default)

### Fuzzy 매칭 기술

- Product의 brand / name / sku / imageUrl을 embedding (Gemini embed)
- 기존 CatalogEntry 임베딩과 cosine similarity 비교
- 상위 3개 후보 + LLM 판정 ("이 두 상품이 같은 상품인가?") → JSON `{ sameProduct: bool, confidence: float, reason: string }`
- 비용 추적 (`LlmUsage` 연동)

### Catalog 대표 URL

- CatalogEntry에 `primaryUrl` 필드: 우선순위에 따라 자동 선택
  1. 브랜드 공식 도메인 URL
  2. 공식 리테일러 URL
  3. 최근 스크레이핑된 URL 중 신뢰도 최고
- Admin에서 수동 변경 가능

### 최저가 조회 (Cross-Platform Scan)

- CatalogEntry 상세 화면 "최저가 조회" 버튼
- 기존 Pivot Search 재활용 (brand + productName + sku 쿼리)
- 결과는 `CatalogEntry.lowestPrice` + `ProductCrossPlatformScan[]`로 저장
- **예산 cap**: 초기엔 없음, Admin 모니터링. 추후 일일/월 cap 설정 가능

---

## Rationale

- URL 기반 Product ID = 중복 없는 원본 식별자
- Catalog ID = 의미 기반 그룹 (최저가 비교·매칭)
- **이중 체계**가 표준 이커머스 패턴과도 일치 (SKU vs Listing)

### Considered Alternatives

1. **URL 단일 식별만 사용**: 같은 상품인지 알 수 없어 최저가 비교·운영자 관리 어려움. 기각.
2. **Shopify Product만 사용**: Shopify는 URL 개념 없고, 고객이 보내오는 다양한 URL 관리 어려움. 기각.
3. **Catalog 없이 Pivot Search만**: 매 조회마다 재계산해야 해 운영 부담. 기각.

---

## Consequences

### Positive

- 같은 상품의 가격 비교 운영 가능
- 중복 스크레이핑 방지 (이미 있는 CatalogEntry라면 Pivot Search 스킵 가능)
- Cross-Platform Max-Benefit 추적이 자연스러움

### Negative

- AI 매칭 오탐 → 잘못 그룹화된 Catalog의 정리 비용
- 운영자 큐 volume이 초기엔 많을 수 있음

### Risks

- brand/sku 추출 실패율에 강하게 의존 → Scraper v6 identity 정확도가 상한
- SKU 없는 카테고리(식품·농산물) → Catalog ID null 운영 → 별도 처리 필요

---

## Implementation

### Data Model (신규)

```prisma
model CatalogEntry {
  id                String   @id @default(uuid())
  catalogId         String   @unique                  // computed hash (brand+name+sku)
  brand             String
  productName       String
  sku               String?
  primaryUrl        String?                           // 대표 URL
  primaryProductId  String?                           // 대표 Product
  imageUrl          String?
  category          String?
  releaseDate       String?
  season            String?
  lowestPriceKrw    Int?
  lowestPriceScanAt DateTime?
  confidence        Float                              // 매칭 신뢰도 평균
  unmatched         Boolean  @default(false)          // CatalogID 없는 상태
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  products          CatalogMatch[]
  scans             ProductCrossPlatformScan[]

  @@index([brand, sku])
  @@index([unmatched])
}

model CatalogMatch {
  id                String   @id @default(uuid())
  catalogEntryId    String
  productId         String
  matchType         String                              // AUTO_EXACT | AUTO_FUZZY | MANUAL
  confidence        Float
  matchedBy         String?                             // actor userId (MANUAL일 때)
  matchedAt         DateTime @default(now())

  entry             CatalogEntry @relation(fields: [catalogEntryId], references: [id])

  @@unique([catalogEntryId, productId])
  @@index([productId])
}

model ProductCrossPlatformScan {
  id                String   @id @default(uuid())
  catalogEntryId    String
  platform          String                              // coupang | naver | gmarket ...
  url               String
  priceKrw          Int
  maxBenefitPriceKrw Int?
  benefitMethod     String?
  observedAt        DateTime @default(now())

  entry             CatalogEntry @relation(fields: [catalogEntryId], references: [id])

  @@index([catalogEntryId, observedAt])
}
```

### Admin UI

`/admin/catalog` — 카탈로그 리스트
- 필터: brand, unmatched, 최근 업데이트
- 컬럼: catalogId, brand, productName, SKU, 상품수, lowestPrice, primaryUrl

`/admin/catalog/matching-queue` — 매칭 필요 큐 (신규)
- 0.60 ≤ confidence < 0.85 대기 리스트
- 후보 카탈로그 3개 + "새 카탈로그로 분리" 옵션 + 관리자 판정

`/admin/catalog/[catalogId]` — 카탈로그 상세
- 매칭된 상품 리스트 (URL별 가격 비교 그래프)
- "최저가 조회" 버튼 → Pivot Search 트리거
- 스캔 이력 (ProductCrossPlatformScan)

---

## Related

- [ADR: Scraper_v6_Pivot_Search](2026-04-15_ADR_Scraper_v6_Pivot_Search.md)
- [Plan: Catalog Matching Engine](../../docs/plans/2026-04-19-catalog-matching-engine-plan.md)
- [Admin Dashboard PRD 05](../master-plan/05_ADMIN_DASHBOARD_PRD.md)
