# Shopify as Full Backend of Record (v2.0)

> **Date**: 2026-04-19
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted
> **Store**: `aigent-kim.myshopify.com`

---

## Context

v6 ADR에서 이미 "Shopify As Shipping Backend"로 배송·관세 계산을 위임했으나, v2.0에서는 범위를 더 넓혀 **회원·상품·결제·세금·배송·추적·마케팅·자동화 전체를 Shopify에 위임**한다. 자체 DB는 **스크레이핑·카탈로그 매칭·국내 발주 관리·Compliance** 등 "Shopify가 모르는 도메인 로직"에만 집중한다. 이 결정은 v2 운영 구조의 핵심 프레이밍이며, 이후 모든 스펙의 전제가 된다.

---

## Decision

### 1. Shopify에 위임하는 데이터·기능 (정본, SSoT)

| 영역 | Shopify 책임 |
|------|-------------|
| Customer | Classic Customer Accounts (등록·로그인·주소록·주문 이력) |
| Product Catalog | Product / Variant / Inventory (Cart-add 시 자동 생성) |
| Cart & Checkout | Draft Order → Checkout URL → 결제 페이지 |
| Payment | PortOne v2 (해외카드·간편결제) + PayPal (Shopify 결제 앱) |
| Tax | 국가별 세금 자동 계산 + DDP |
| Shipping | Third-party calculated rates (AcrossB 앱) + Fulfillment |
| Tracking | AcrossB 송장 + Shopify 고객 알림 자동 트리거 |
| Marketing | Shopify Email + Automation (Abandoned cart, 재구매) |
| Discount | Shopify Discount (쿠폰 / 할인 룰) |
| Order | Order lifecycle (paid → fulfilled → delivered) |
| Refund | Shopify Refund API + PortOne/PayPal 자동 환불 |
| Reports | Shopify Analytics / Markets Pro Report |

### 2. 우리 DB에만 존재하는 영역

| 영역 | 우리 책임 |
|------|----------|
| **Scraping** | ScrapeRequest / ScraperCache / BrandOfficialDomain / ProductScrapeVersion |
| **Catalog Matching** | CatalogEntry / CatalogMatch (AI + 운영자 큐) |
| **Product Mirror** | ShopifyProductMirror (72h TTL + 재조회 재사용) |
| **Domestic Procurement** | 9-step 국내 발주 상태머신 (1A~1I) |
| **Compliance Engine** | DG/검역 분할 · FTA 렌더링 · Abandonment · 저가신고 Lock |
| **Chargeback** | Incident 기록 + Email 블랙리스트 |
| **Audit/Ops Log** | AdminAuditLog / ApiUsage / LlmUsage / SessionEventLog |
| **LLM Conversation** | ChatSession / Message / UserMemory / UserPreferences |
| **Cross-Platform Max-Benefit** | 관리자 전용 최저가 교차조사 |

### 3. 동기화 규칙

- **Customer**: 구매 완료 시 Shopify Customer 생성 → `User.shopifyCustomerId`만 저장
- **Product**: Cart-add 시 `productCreate` → `ShopifyProductMirror` 매핑
- **Order**: Shopify webhook `orders/paid` → 자체 `Order` + `ProcurementTask` 레코드 생성
- **Fulfillment**: 우리 Ops → `fulfillmentCreateV2` with AcrossB tracking → Shopify가 고객 알림 자동 발송
- **Refund**: 관리자 Shopify Admin에서 실행 또는 우리 API → Refund API 호출

### 4. 운영 스토어

- 실제 도메인: `aigent-kim.myshopify.com`
- 커스텀 도메인: TBD (v2 운영 시작 전 결정)
- 권장 요금제: **Shopify Advanced** (근거 아래 Rationale 참조)

### 5. 보안 · Credential

- Private App으로 Admin API 액세스 (v2 전용)
- API Key / Access Token은 `.env.local`만 저장, Git 커밋 금지
- `.env.example`에 환경변수 이름만 기재: `SHOPIFY_ADMIN_ACCESS_TOKEN_V2`, `SHOPIFY_API_KEY_V2`, `SHOPIFY_STORE_DOMAIN_V2`
- 레거시 v1 토큰과 명확히 분리

---

## Rationale

### Advanced Plan 추천 근거

| 기능 | Basic | Grow | **Advanced** ✅ | Plus |
|------|:---:|:---:|:---:|:---:|
| Markets (복수 통화·지역) | 기본 | 기본 | 기본 | 기본 + Pro |
| **Third-party Carrier Calc Shipping (AcrossB 실시간 요율)** | ❌ | ❌ | ✅ | ✅ |
| **15개국 presentment currency** | 부분 | 부분 | 전체 | 전체 |
| **API Rate Limit** (burst points/sec) | 100 | 200 | **500** | 2,000 |
| Staff accounts | 2 | 5 | **15** | unlimited |
| Fraud Analytics | 기본 | 기본 | **고급** | 고급 |
| Checkout Customization | 기본 | 기본 | 기본 | **Extensibility** 풀 |
| 월 요금 (USD) | ~$39 | ~$105 | **~$399** | ~$2,300+ |

**핵심 근거**:
1. **AcrossB Third-party Carrier API** → Advanced 이상 필수 (Grow에서는 live rate 불가, 고정 테이블만)
2. **54개국 Markets 대응** → 15개국 이상 presentment currency → Advanced 이상 권장
3. **Cart-add마다 productCreate + variantsCreate + draftOrderCalculate** → API 호출량 많음. Advanced의 500 points/sec burst가 안전 마진
4. **한국 사업자로 해외 고객 대상** → Markets Pro까지는 불필요, Advanced의 "Markets + 다국가 도메인"으로 충분

**Grow로 시작한다면 리스크**:
- AcrossB 실시간 요율 미적용 → 배송비 부정확 → 수익 누수
- API limit hit 시 Cart-add 실패 → 전환율 저하
- 최소 초기 2~3개월 후 Advanced로 업그레이드 불가피

**대안 검토**: Shopify Plus는 예산 과다. Markets Pro 없이도 PortOne + AcrossB + 커스텀 Next.js로 동일 기능 가능.

### Classic Customer Accounts 결정

- New Customer Accounts는 Shopify hosted 페이지 strong lock-in → AI 채팅 UX와 어긋남
- Classic은 이메일+비번 기반 단순, 우리 프론트에서 일부 커스터마이즈 가능
- 이메일 OTP 로그인으로 확장 가능

### Headless 유지 근거

[별도 ADR: Headless_Frontend_Decision](2026-04-19_ADR_Headless_Frontend_Decision.md) 참조.

---

## Consequences

### Positive

- **운영 부담 대폭 감소**: 회원/결제/세금/마케팅 자동화까지 Shopify가 처리
- **규제 변동 내성**: Shopify가 국가별 규제(2026 Section 321 등) 선제 대응
- **Ops 도구 활용**: Shopify Admin의 order/customer/discount 관리 기능 그대로 사용 가능
- **보안 감사 단순화**: 결제·PII 저장 책임이 대부분 Shopify로 이관

### Negative

- **Advanced 요금제 부담**: 월 $399 (연 $4,788) — 초기 트래픽 작을 때 고정비
- **Shopify UI 의존**: Checkout/Customer 화면 커스터마이즈 제한
- **Webhook 장애 의존**: Shopify 장애 시 우리 주문 상태 지연
- **벤더 락인**: 향후 Shopify 탈피 시 전면 재설계 비용

### Risks

- Advanced 플랜 기능 변경 위험 → 계약 시 Shopify로부터 로드맵 확인 필요
- PortOne Shopify 앱의 안정성 → PortOne v2 직접 연동 백업안 준비
- AcrossB 앱의 정확도 → 초기 6개월 수동 검증 SLA 운영

---

## Implementation

- [v2 MASTER PLAN](../master-plan/v2-MASTER-PLAN.md) — 전체 개요
- [Payment Integration Plan](../../docs/plans/2026-04-19-payment-integration-portone-paypal-plan.md)
- [AcrossB Shipping Integration Plan](../../docs/plans/2026-04-19-acrossb-shipping-integration-plan.md)
- 이 ADR이 v2의 모든 스펙의 **전제**로 참조됨

---

## Related

- [ADR: Shopify_As_Shipping_Backend (v6)](2026-04-15_ADR_Shopify_As_Shipping_Backend.md) (확장)
- [ADR: Headless_Frontend_Decision](2026-04-19_ADR_Headless_Frontend_Decision.md)
- [ADR: Domestic_Procurement_9Step](2026-04-19_ADR_Domestic_Procurement_9Step.md)
- [ADR: Catalog_ID_Strategy](2026-04-19_ADR_Catalog_ID_Strategy.md)
