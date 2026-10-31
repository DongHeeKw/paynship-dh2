# 점검 보고서 — 04_김도윤rebuild설계 (2026-10-07, 읽기 전용 감사 원본)

# PayNShip MVP 계획 문서 3종 × rebuild 설계·정책 문서 정합성 감사 (2026-10-07)

읽기 전용으로 점검했고, 파일은 하나도 고치지 않았습니다.

**경로 약칭**
- `R/` = `/Users/yohanpark/repo/paynship/kbuyer-latest/rebuild/` (로컬 HEAD `b0e9774`, 10/6)
- `D/` = `/Users/yohanpark/repo/paynship/docs/`
- 01 = `D/01_정책서_PayNShip-MVP.md`, 02 = `D/02_요구정의_기능목록.md`, 03 = `D/03_통합PRD_PayNShip-MVP.md`, 89 = `D/89_레드팀_사전QA_261006.md`, MP = `D/plans/261006_rebuild_통합_머지계획.md`

## 요약

- **기한·SLA 숫자는 B 코드와 모두 일치합니다.** 다만 정책서 표에는 15종 중 10종만 실려 있습니다.
- **오늘 결정(P-1·P-2)으로 '1회 결제 원칙(S1)'이 사실상 바뀌었습니다.** 01·02·03·89 곳곳의 "추가 결제 없음"과 "결제 경로는 2개뿐" 문구를 고쳐야 합니다.
  - P-2는 B의 2차 결제 차액 로직과 잘 맞습니다. 버퍼를 견적에 넣으면 기존 코드가 흡수 판정을 거의 대신합니다.
  - P-1은 B의 결제 단계 구조(PHASE1·PHASE2)로는 받을 수 없어서 새로 만들어야 합니다.
- **S4(Shopify를 주문 원장으로)는 B 설계 원칙과 정면으로 부딪힙니다.**
  - B 원칙: canon §7 "로컬 상태를 먼저 저장하고 Shopify와 분리", CUSTOMER_JOURNEY §4 "Shopify는 결제 수단".
  - 영향 범위: 도메인 서비스 8개(약 2,240줄), 스키마의 결제 관련 모델 4개, 웹훅, 워커. 규모 추정은 §2에 적었습니다.
- **B 동작을 잘못 적은 곳이 10건입니다.** 특히 영향이 큰 것:
  - 견적 게이트 필수 필드 목록
  - 구매 전 취소의 상태 전이
  - "만료 링크로는 정산 안 됨"
  - "환불 실패 후 수동 완료" 흐름
  - 차지백 웹훅

---

## 1. 갭 표

| # | 주제 | rebuild 원천 요지 | 우리 문서 현재 | 판정 | 중요도 | 수정 제안 |
|---|---|---|---|---|---|---|
| 1 | 기한 값 | `R/packages/config/src/defaults.ts:479-498` (12h·48h·24h·4h·24/48h·72h·3/7일·14일). 견적 24h(:542), 링크 48h(:545) | 01 §2 설정표·§9 기한표 | 값은 **일치** | — | 유지 |
| 2 | 기한 종류 | canon §12.3: 처리기 15종. 의향 검토 4영업시간, 증거 보강 2h, 반품 승인 4영업시간·회송 5영업일·도착 7일·반품 검수 14일, 포기 48h, 차지백 관찰 24h | 01 §9는 10종만 싣고 "15종"이라고 씀. "검토 중" 처리 예정 시각 값(2h)도 없음 | **누락** | 중 | §9 표에 15종 전부와 처리기 이름을 함께 적기 |
| 3 | 결제 링크 만료 | OPS_JOURNEY §2c 설계는 `expiresAt = quote.validUntil`. 코드는 고정 48h(`checkout.ts:115`). `EXPIRED→PAID`를 허용하고(`state-machine.ts:152-159`) 만료 요청도 정산함(`settlement.ts:59-62`, "Money reality wins") | 03 FR-B-053 "견적 만료 링크로는 결제가 **정산되지 않는다**" | **상충** | 상 | 정산 거부는 실제 받은 돈을 묶어 둡니다. "만료 시 draft 삭제(gateway에 `draftOrderDelete` 없음, 신규) + 만료 후 입금은 정산한 뒤 운영 큐로 환불"로 수정 |
| 4 | 견적 게이트 필드 | canon §4·§12.1: 필수 4필드 = `weightKg·hsCode·originIso2·domesticShippingKrw`. 선행 조건 = `priceKrw·category`. 치수는 soft gate | 01 §3 "가격·무게·카테고리/HS·원산지·**재고**" | **오기** | 중 | 국내 배송비 추가. 재고는 B 게이트에 없음(발주 단계 `availabilityStatus`) |
| 5 | Order 14 상태 | `state-machine.ts:80-110`. 결제 후 주문의 운영자 취소는 `REFUND_PENDING`을 거침(`cancel/route.ts:39-56`, canon §12.3 개정) | 03 §7.3 `PENDING_PAYMENT→CANCELLED: 구매 전 취소`. `PENDING_PAYMENT→REFUND_PENDING`, `DELIVERED→REFUND_PENDING` 없음 | **오기·누락** | 중 | 취소 = `REFUND_PENDING→REFUNDED`로 그리기. `CANCELLED`는 미수금 주문에만 |
| 6 | OrderIntent | 7상태 일치. 체크아웃은 무조건 자동 승인(`checkout.ts:95-101`). `review()`는 상태만 바꾸고 결제 링크를 만들지 않음(`intent.ts:174-182`) | 02 FR-O-011 "승인 → 결제 링크" `신규 B API` | 일치 + **누락** | 중 | "승인 시 PaymentRequest·Draft 생성 경로"도 신규로 명시 |
| 7 | Procurement | Task `FAILED→QUEUED`(코드)와 OPS §2d `FAILED→RESEARCHING`(B 문서끼리 불일치). `ProcurementTask.orderIntentId @unique`, 상품·수량 컬럼 없음(metadata에 저장). `createTask`는 기존 배치가 있어야 함(`procurement.ts:224-228`, `schema.prisma:600-627`) | 02 33.0·FR-B-030·03 §8.2 "상품별 발주 작업, `batchId=null`" | **누락** | 상 | 스키마에 `productId/lineIndex/quantity` 추가, intent 유니크 해제, `createTask`의 배치를 선택값으로. 03 §7.2 변경표에 추가 |
| 8 | Return | `RETURN_TRANSITIONS`에 `REQUESTED→EXPIRED` 있음. 완료 시 환불액 = `refundAmountUsd ?? 0`(`return.ts:366-401`). CUSTOMER_JOURNEY §2: **수령 후 5영업일, 언박싱 영상**, 환불 = 결제액 − DDP − $10 | 01 §7·FR-C-044: 배송 완료 후 14일, 사진 | **상충** | 상 | §2 P-3 참조 |
| 9 | Refund | `process()`가 Shopify 확인 전에 동기로 `COMPLETED` + 주문 `REFUNDED` 처리(`refund.ts:189-230`, Ops-Domain Spec §8에 "Phase 6 MUST fix"). 환불은 PHASE1 Shopify 주문에만 실행(`refund-processor.ts:45-50`) | 01 §7 "환불 실행 실패 → 운영자 수동 → super_admin 완료" | **상충** | 상 | B에서는 실패해도 이미 REFUNDED 상태라 그 흐름이 생기지 않음. `refunds/create` 확인 후에만 COMPLETED로 바꾸는 것을 M2 필수로 |
| 10 | 검수 범위 | CUSTOMER_JOURNEY §2: 기본($0) = **미개봉 재포장**, 개봉 검수 = $7 | 01 §3·§6: 기본 = 외관·수량·옵션·사진(무료) | **상충** | 중 | 기본 검수에서 개봉하는지와 원가를 결정 |
| 11 | 차지백 | OBSERVATION/BLOCKED = 사용자 차단 모델. 라우트·분쟁 웹훅 없음. 환불 상한에 차지백 미반영(`refund.ts:140-147`) | 01 §7 "증빙 대응, 분쟁 중 추가 환불 차단". 03 §4 "생성: **웹훅**·운영자" | **오기·누락** | 중 | `disputes/*` 웹훅·증빙 묶음·환불 차단을 신규로 표기 |
| 12 | 포기(Abandonment) | 환불 없음, 48h 통지, 관리자 최종 승인 | 01 §7 P2 | 대체로 일치 | 하 | — |
| 13 | 수수료 공식 | (상품 + 국제배송) × rate(`compute-quote.ts:214`). `FeeCapRule.minFeeUsd`는 있으나 계산에 안 씀(`schema.prisma:888-905`) | 01 §3·S3 | **일치**(변경 의도 명시) | — | — |
| 14 | 반올림 | COST_ENGINE §5: "totals are exact float sums" | 02 FR-B-015 항목별 센트 반올림 | **상충**(의도된 변경) | 중 | COST_ENGINE §5·골든 테스트·canon §3 개정을 FR에 포함 |
| 15 | 301 관세 하한 | canon §12.5: `dutyRate = min(fta, mfn)` 불변식 | 01 §3·FR-B-011 `max(mfn, 12.5%)` + 앨범 예외 | **상충**(의도) | 상 | canon §12.5 개정 ADR 필요(추가 관세 층) |
| 16 | DDP 관세 초과분 | CUSTOMER_JOURNEY §2: "Overage is customer's responsibility", DDP 환급 불가 | 01 §1·§2: "국경에서 추가 청구 없음", 빠진 관세는 회사 부담 | **상충** | 상 | 특송사 실청구가 견적보다 클 때 누가 내는지 결정 |
| 17 | 환율 드리프트 | CUSTOMER_JOURNEY §2: 4h 크론, 5% 이상이면 PaymentRequest 무효·재발행. 코드 없음 | 01 §3 일 1회, 견적 시점 고정 | **상충**(설계) | 중 | 폐기 또는 채택을 B 문서에 반영 |
| 18 | 에이전트 범위 | CONVERSATIONAL_AGENT(SPEC_STUB): classify→execute, 10개 액션(search·memory 포함, `checkout`이 Intent 생성). SECURITY §4a: 수집한 HTML은 적대적 입력 | 01 §8 도구 7종, 결제 실행 안 함 | **상충**(재작성 예정) + **누락** | 중 | 프롬프트 인젝션, 게스트 세션 HMAC, 에이전트 레이트리밋(canon §12.7)을 01 §8에 추가 |
| 19 | Shopify 연동 | EXTERNAL §2: API 2025-07, 웹훅 6토픽, `orderCancel`·`fulfillmentCreate`. 코드: 2025-01, `orders/paid`만, 한 줄 총액, `requiresShipping:false`(`shopify-gateway.ts:165-182`) | 03 §8.1 | 코드 기준 **일치** + **누락**(disputes 토픽, `draftOrderDelete`·`orderCancel` 미구현) | 중 | 신규 목록에 추가 |
| 20 | 게스트 보안 | canon §8·SECURITY §2.1-2.3: `paynship_session_token/guest_token` HMAC, migrate 전 소유 검증 | 01·02·03: 비로그인 장바구니 → 로그인 후 유지. HMAC 언급 없음 | **누락** | 중 | FR-C-032 수용 조건에 HMAC 검증 후 장바구니 이전 추가 |
| 21 | 관리자 역할 | canon §8: 미등록은 viewer. SECURITY §3.1: 미등록은 null(B 문서끼리 불일치). 코드는 viewer. 행위자는 공용 `ADMIN_API_TOKEN` + **자기 신고 `x-actor-email`**(`R/apps/web/lib/admin-auth.ts:37-62`) | 03 §7.5 "미등록 viewer [실측]". 01 §2 역할표(라우트 권한과 일치) | 값 **일치**, **누락** | 상 | NextAuth 전까지 감사로그 행위자는 위조 가능 → M3 수용 테스트 전 개인 계정 인증 필수로 |
| 22 | 릴리스 블로커 | STATUS:11-20 4건 | MP M0 4건 | **일치** | — | 추가 필요: STATUS:5·28의 Phase 3 잔여(critical-field 단계가 통과만 함, 옵션 인지 수집) |
| 23 | ROADMAP 단계 | 앞 단계 관문 통과 전 착수 금지. Phase 3 exit = 쿠팡·네이버·G마켓 코퍼스. Phase 6에 상업 송장 PDF(canon §9 Consolidation) 포함 | MP M2가 Phase 3 미완 상태로 Phase 6(UI·에이전트) 착수. M1 업그레이드는 ROADMAP에 없음. 송장 PDF 언급 없음 | **상충·누락** | 중 | 예외 ADR 1건. M3 또는 M4에 다품목 상업 송장 추가 |
| 24 | v1 범위 | MASTER_PLAN Scope: KRW→USD 외 다통화 · 판매처 가격 스캐너는 **연기** | 01 S6(표시 8종)·S7(최저가) MVP 포함 | **상충** | 중 | MASTER_PLAN 개정 또는 ADR |
| 25 | LLM ADR | `ADR/2026-10-06_gemini-model-refresh.md` 상태 **Proposed**, 추출 모델만 다룸. 기존 DB는 `llm.model=gemini-2.5-flash` 행 유지 | 01 §10 D8 "추출+에이전트" | **누락** | 하 | §2 D8 참조 |

---

## 2. 오늘 결정이 rebuild 설계와 부딪히는 곳

### P-1 가격 상승분 고객 추가 결제 — B에는 경로가 없습니다

- **B에 있는 것은 결제 전 변동뿐입니다.**
  - `ACCEPTED→REQUOTE_REQUIRED`(`state-machine.ts:127-131`, OPS §2b)
  - 구매 시점 비교 로직은 0줄입니다. `recordPurchase`는 `actualPriceKrw` 저장만 합니다(`procurement.ts:323-375`).
  - `PriceChangeDecision`은 B에 없고, 우리가 제안한 모델입니다(03 §7.2).
- **PHASE2를 다시 쓸 수 없는 이유**
  1. 2차 결제 요청은 `WAREHOUSE_RECEIVED`에서만 됩니다(`phase2-billing.ts:56-58`). 가격 변동은 `PENDING_PAYMENT` 중에 일어납니다.
  2. 차액 계산은 국제배송·관세·VAT 세 항목뿐이고 상품가는 빠져 있습니다(`phase2-billing.ts:36-60`).
  3. `PaymentRequest @@unique([orderIntentId, phase])`와 `ShopifyPaymentEvent @@unique([orderId, phase])`(`schema.prisma:473, 560`) 때문에 실측 2차 결제와 같은 칸을 놓고 충돌합니다.
  4. PHASE2 정산은 주문을 `SHIPPING`으로 옮깁니다(`settlement.ts:100-119`).
  5. 환불은 PHASE1 주문에만 실행됩니다.
- **필요한 작업**
  - `PaymentPhase`·`ShopifyPhase`에 `PRICE_ADJUSTMENT` 추가
  - 정산 분기: 결제되면 해당 발주 작업 보류 해제
  - 고객 동의 기한 처리기(B CLAUDE.md "기한 필드 = 처리기" 규칙)
  - 여러 Shopify 주문에 나눠 환불하는 경로
  - **차액은 원시 가격 차가 아니라 `computeQuote` 재계산(동결 환율)으로 냅니다.** 상품가 기준 수수료(S3), 신고가 = 실결제가인 관세(01 §6), VAT가 함께 변하기 때문입니다.
- **결정이 더 필요한 모호점**
  - "초과분"이 견적 대비 전액인지, 허용 범위를 넘은 부분만인지
  - 고객 무응답 시 기본값
- **고칠 곳**
  - 01: §5 가격 변동 표, §4 "결제 경로 두 가지뿐", §10 P-1
  - 02: 37.0, FR-O-035, FR-C-046
  - 03: FR-O-035, §8.2 불변식 3, §5.5 문구
  - 89: RT-07 권고

### P-2 견적 무게 +20% 버퍼 — B 설계와 잘 맞습니다(정정 포함)

- **버퍼 개념은 B 설계에만 있습니다.**
  - canon §9: express(<0.5kg)는 "Phase-1 includes shipping + 20% buffer"
  - COST_ENGINE §5.2: 버퍼는 `computeQuote` 밖의 도메인 서비스 책임
  - 구현은 없습니다. `quote-gate.ts`·`compute-quote.ts`에 버퍼가 없고, `expressPath`를 true로 쓰는 코드도 없습니다(`order.ts:120`).
  - `CATEGORY_VOLUMETRIC_MULTIPLIER`(`defaults.ts:199`)는 부피 추정치이지 버퍼가 아닙니다.
- **맞물리는 점: B 2차 결제가 흡수 판정을 이미 합니다.**
  - 차액 = `max(0, 실측 − 받은 금액)`(`phase2-billing.ts:32-34`)이고, 0이면 바로 `SHIPPING`으로 갑니다(:13-16).
  - 버퍼가 견적에 들어가면 실측이 1.2배 이하일 때 2차 결제가 생기지 않습니다.
  - 따라서 FR-B-047(흡수 판정 신규)은 "버퍼를 견적에 넣기 + 실측 입력 시 2차 결제 요청 자동 호출"로 줄어듭니다.
- **충돌**
  1. canon §9·§12.3의 express 0.5kg 가드 → "실측 청구 무게 > 버퍼 포함 견적 무게"로 바꿔야 합니다(canon 개정).
  2. 버퍼를 `weightKg`에 넣으면 부피 무게(배수 × weightKg, `weight.ts`)도 함께 커지고, `Quote.priceInput` 스냅샷의 의미가 바뀝니다. 배송비에 넣을지 함께 정해야 합니다.
  3. 현재 B 수수료 기준(상품+국제배송)이면 버퍼가 수수료도 올립니다. S3 기준(상품가)으로 바꾸면 영향이 없습니다.
  4. 골든 테스트와 COST_ENGINE §5 값이 바뀝니다.
  5. **2차 결제는 크레딧을 주지 않습니다.** 쓰지 않은 버퍼는 회사가 가지므로 환급 여부와 고지 문구("배송비 추정 +20% 포함")를 정해야 합니다.
  6. FR-B-048(흡수 손실 기록)은 "과수금 기록"으로 바뀝니다.

### P-3 반품 — B 고객 여정 정책과 같고, 코드는 비어 있습니다

- **문구는 B와 일치합니다.** CUSTOMER_JOURNEY §2: 하자만, 단순 변심 불가, 국제 반송비 고객 부담, 환불 = 결제액 − DDP − $10
- **다른 점과 빈 곳**
  - 접수 기한: B는 수령 후 5영업일 + 언박싱 영상, 우리는 14일 + 사진
  - `ReturnService.request`는 주문 상태·기한·사유를 검사하지 않습니다(`return.ts:201-230`).
  - 환불 계산기가 없습니다(:366-401). $10 상수는 config에 없습니다($5 취소 수수료만 있음).
  - 배송 완료 14일 자동 완료(`defaults.ts:490`)가 반품 접수를 닫습니다. 접수 기한과 맞춰야 합니다.
- **필요한 작업:** `RETURN_PROCESSING_FEE_USD`, `ReturnRequest` 사유 enum(DEFECT/WRONG_ITEM), 도메인 계산기, 기한 검증, 고객 API
- **법무:** 오배송까지 반송비를 고객이 내는 것은 전자상거래법 제18조(계약과 다른 이행 시 반환 비용은 판매자 부담) 위반 소지가 있습니다. [추정 — 준거법 미확정, 02 확인 필요 #9]

### P-4 취소 비용 — 공식은 같지만 '구매 전' 정의가 다릅니다

- **같은 점:** B도 사후 취소 비용 = 2 × `domesticShippingKrw` + $5입니다(`order.ts:286-296`, `cancel/route.ts:44-50`).
- **다른 점**
  1. B의 '구매 전'은 주문 상태가 `PENDING_PAYMENT`인 동안입니다. 전량 구매 전까지 계속되므로 일부만 구매된 주문도 $0입니다. 우리는 "발주 작업 전부 `QUEUED`"입니다.
  2. `Order.domesticShippingKrw`를 쓰는 코드가 없어 실제로는 $5만 뺍니다. 판매처가 여럿이면 주문당 칸 하나로는 부족합니다.
  3. "출고 후 불가"를 B는 막지 않습니다. 관리자 취소가 `SHIPPING/DELIVERING→REFUND_PENDING`으로 통과합니다(차지백 때문에 상태 기계가 아니라 취소 경로에 가드가 필요합니다).
  4. 환율 주입이 없으면 1400 폴백을 씁니다(`order.ts:291`). [추정: 운영에서는 주입됨]

### P-9 구매 전 즉시 셀프 취소 — 신규 작업이 큽니다

- **B 현황:** 고객 취소 API가 없습니다(`R/apps/web/app/api`에는 quote·cart·checkout·webhooks뿐). canon §9의 통합 취소 엔드포인트는 설계만 있습니다.
- **필요한 작업**
  - 본인 확인: 현재 `/orders/[id]`는 링크를 아는 사람이면 누구나 보는 주소라 세션 바인딩이 필요합니다.
  - 운영자 구매와의 경합 잠금: 한 트랜잭션 안에서 작업 전부 `QUEUED` 확인 + 행 잠금. 리포지토리에 잠금 API가 없습니다. [추정]
  - 환불 즉시 처리: 지금은 운영자가 처리하거나 48h 처리기가 자동 처리합니다.
  - Shopify `orderCancel`: gateway에 없습니다.
  - 결제 전 취소 후에도 draft가 살아 있으면 결제가 들어올 수 있고, 그때 `PAYMENT_ON_CANCELLED_INTENT` 경보가 납니다(`settlement.ts:139-148`).
  - 에이전트 `request_cancellation` 도구는 '접수'에서 '실행'으로 범위를 다시 잡아야 합니다.
- **고칠 곳:** 01 §7, 02 16.0·FR-C-043, 03 FR-C-043·§13, MP M5

### P-6·P-8

- **P-6 (자동 승인 기준)**
  - 수량은 `quote.priceInput.lines[].quantity`로 판정할 수 있습니다.
  - $300 기준이 총액인지 상품가인지 명시가 필요합니다.
  - 검토(4영업시간, 주말 포함 시 더 길어짐) 중에 24h 견적이 만료될 수 있으므로 "승인 시 견적 재검증 → REQUOTE" 규칙이 필요합니다.
- **P-8 (Shopify 할인)**
  - 정산은 받은 금액이 `amountUsd − $0.50`보다 작으면 주문을 만들지 않습니다(`settlement.ts:64-74`, `defaults.ts:553`). 할인 코드를 쓰면 **주문 생성이 실패합니다.**
  - 대안: Draft 생성 시 서버가 `appliedDiscount`를 넣고 `PaymentRequest.amountUsd`에 할인 후 금액을 기록합니다.
  - 고객이 draft 인보이스 결제 화면에서 직접 코드를 입력할 수 있는지는 확인이 필요합니다. [추정]
  - 01 §2·§3의 "수수료율 10→5% 플래그" 문구도 바꿔야 합니다.

### S4 Shopify = 주문 원장

- **정면 충돌하는 B 설계**
  - canon §7 "Decouple local state from Shopify", §5(Order에서 `shopifyOrderId` 제거)
  - CUSTOMER_JOURNEY §4
  - `R/packages/domain/src/services/payment-gateway.ts`: 도메인이 아는 Shopify 기능은 `createInvoice`뿐
  - 우리 89 §1과 03 §7.1의 "원장 = 자체 DB" 판정
- **구조적 문제**
  1. 결제 전(Intent·PaymentRequest)은 어차피 로컬입니다.
  2. 1차·2차·가격 조정 결제가 별도 Shopify 주문으로 갈라집니다. Shopify 주문 수정(order edit)으로 한 주문에 항목을 더하는 방식이 원장안을 현실적으로 만듭니다. [추정]
  3. 14개 운영 상태는 Shopify에 없습니다. 태그·metafield로 미러링해야 합니다.
  4. 환불은 Shopify 확인을 정본으로 삼아야 합니다. #9의 '먼저 REFUNDED 처리'와 양립하지 않습니다.
  5. 항목별 줄, `requiresShipping:true`, 6~8개 웹훅 토픽과 대사(reconciliation) 작업이 필요합니다.
- **영향 파일**
  - `R/packages/domain/src/services/{checkout,settlement,refund,phase2-billing,order,abandonment,chargeback,intent}.ts` (약 2,240줄)
  - `R/packages/domain/src/deadline-sweeper-handlers.ts` (자동 환불·자동 취소·만료 처리기)
  - `R/packages/providers/src/shopify-gateway.ts` (232줄)
  - `R/packages/db/prisma/schema.prisma`: Order·PaymentRequest·ShopifyPaymentEvent·Refund와 단계 enum, 해당 리포지토리 3개
  - `R/apps/web/app/api/webhooks/shopify/route.ts` (93줄)
  - `R/workers/scrape-worker/src/{refund-processor,composition}.ts`
  - canon §5·§7·§9·§12.3, EXTERNAL §2
- **규모** [추정]
  - "Shopify 주문 = 판매·결제·환불·출고 기록, 운영 상태는 자체 DB" 절충안: 약 1.5~2.5주
  - 주문 상태까지 Shopify 정본: 4주 이상, canon 재작성 수준
- **권고:** ADR에서 어느 쪽인지 먼저 정의해야 합니다.

### D2·D8

- **D2:** MP §5 M0의 첫 항목이 레포 교체입니다. M0이 끝난 뒤로 옮기고, M0 작업 위치(maybedy/kbuyer `rebuild/`)를 적어야 합니다.
- **D8**
  - ADR 상태를 Accepted로 바꿔야 합니다.
  - ADR은 추출 모델만 다룹니다. 에이전트 `gemini-3.7-flash`는 ADR §Consequences에 따라 CONVERSATIONAL_AGENT 스펙에서 정할 사항이라, 01 §10 D8을 둘로 나눠야 합니다.
  - 기존 DB의 seed 행(2.5-flash)은 그대로 남습니다.

---

## 3. 우리 문서의 사실 오기 (B 동작을 잘못 적은 곳)

1. **01 §3:** 견적 필수 값에 '재고'가 있고 '국내 배송비'가 없습니다. → 갭 #4
2. **03 §7.3:** `PENDING_PAYMENT→CANCELLED`를 '구매 전 취소'로 그렸습니다. B에서 수금된 주문은 `REFUND_PENDING`을 거칩니다(`cancel/route.ts:39-56`).
3. **03 FR-B-053:** "만료 링크로는 정산 안 됨". B는 일부러 만료 요청도 정산합니다(`settlement.ts:59-62`).
4. **01 §7:** "환불 실패 → 수동 → super_admin 완료". B는 Shopify 확인 전에 이미 `COMPLETED/REFUNDED`로 바꿉니다(`refund.ts:189-230`).
5. **03 §4:** 차지백을 "웹훅"으로 생성한다고 적었습니다. B 웹훅은 `orders/paid`만 처리하고 차지백 라우트도 없습니다.
6. **01 §7·P-4:** "B 기준으로 통일"이라 적었으나 '구매 전' 정의가 B(주문 `PENDING_PAYMENT`)와 다르고, B는 출고 후 취소도 막지 않습니다.
7. **02 FR-B-047·03 §7.3 주석:** "흡수 판정 신규". 실측 ≤ 받은 금액이면 0원 → SHIPPING으로 가는 로직은 B에 이미 있습니다(`phase2-billing.ts:13-16`). 신규는 버퍼뿐입니다.
8. **02 FR-B-030·03 §8.2:** "상품별 발주 작업 `batchId=null`"을 B 서비스 변경 없이 되는 것처럼 적었습니다. 실제로는 `createTask`에 배치가 필수이고, `orderIntentId @unique`이며, 상품 컬럼이 없습니다.
9. **02 FR-O-061:** "근거 없으면 저장 불가 — B 구현 API". B 증거 보정 라우트에는 근거 필드가 없습니다(`products/[id]/evidence/route.ts:14-31`).
10. **02 FR-C-031·01 §3:** "결제 직전 서버 전체 재견적 — B 구현". B 체크아웃은 저장된 `quoteId`의 유효기간만 확인합니다(`checkout.ts:58-75`). `/api/cart/quote`도 저장된 증거로 재계산할 뿐 판매처를 다시 수집하지 않습니다. [추정] 그래서 판매가 변동은 구매 시점(P-1)에야 드러납니다.

**참고: B 원천 문서끼리 맞지 않는 곳.** 우리 문서는 코드 기준을 따랐으므로 맞습니다.
- 2차 결제 기한: CUSTOMER_JOURNEY는 7일, 코드는 3일
- LLM 신뢰도 기본값: CUSTOMER_JOURNEY 0.72 vs canon 0.70
- KR 원산지 신뢰도: COST_ENGINE은 `category_default`, canon은 0.80
- 미등록 관리자: SECURITY는 null, canon·코드는 viewer
- Slack 환경 변수: EXTERNAL은 `OPS_`, 코드는 `SLACK_OPS_`

**우선 조치:** S4 범위를 정하는 ADR → P-1 결제 단계 설계 → 01·02·03의 "추가 결제 없음 / 1회 결제" 문구 일괄 수정 → 오기 1~10 정정 순서를 권합니다.