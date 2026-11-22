# PayNShip HOME HUB — 자택 배대지 운영·자동 합배송·다중배송 추천 핵심 명세

> **<u>최초 운영에서는 사업주의 집이 PayNShip의 한국 국내 수령지(Home Hub), 검수 공간, 보관 장소, 합배송 포장 장소다. 별도의 3PL 계약은 초기 필수조건이 아니다.</u>**
>
> **<u>합배송 추천은 핵심 사업 로직이다. 동일 수취인의 여러 상품·여러 주문이 있을 때, 시스템이 개별배송 / 모두 합배송 / 일부 합배송 / 기다렸다 합배송을 실제 총비용·배송기한·통관조건으로 비교해 고객과 운영자에게 적합한 대안을 추천해야 한다.</u>**
>
> **<u>PayNShip의 상품 URL 구매와 MD 상품은 하나의 역직구 컴파일러를 사용한다. 고객에게 집 주소·택배사 선택·관세 코드 선택을 맡기지 않으며, 총액·도착기간·합배송 절감액·환불/세금 부담·배송 진행은 투명하게 공개한다.</u>**

**상태:** 2026-11-22 목표 SRS / 아직 구현 완료 아님. 본 문서가 **물류 허브·합배송·다중 주문 처리의 최우선 요구사항**이다. 관련 문서: [제품 헌장](PRODUCT_VISION_COMPILER_AND_MD.md), [전체 AUTO-ENGINE](AUTO_ENGINE_ALGORITHMS_AND_WORK_PROCESS.md), [국가별 통관 테스트](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md), [제품 현황](../Features/STATUS.md).

**UI 구현 상태(2026-11-22):** 고객·운영자용 흰색/주황색 **개발 전용 화면 시안**과 이익 중심 한국어 문구 순수 함수가 추가되었다. [UI 상세 가이드](UI_WHITE_ORANGE_CONSOLIDATION.md) · [실제 미리보기 컴포넌트](../../components/consolidation/ConsolidationPreview.tsx). 금액과 송장은 가상이며 실사용자 동의·합배송 신청·관세 계약과 연결되지 않았다. 

## 기술 구현/검증 시작점

- [TDD 학습 계약](TDD_AGENT_DEVELOPMENT_CONTRACT.md) — 사용자의 사전 코드 승인 대신 에이전트 테스트·설명 책임.
- [테스트 가능한 합배송 계획 선택기](../../lib/compiler/consolidation/recommend.ts) 및 [Vitest 테스트](../../lib/compiler/consolidation/__tests__/recommend.test.ts)는 이미 검증된 후보들 중 추천을 선택하는 **첫 순수 함수 슬라이스**다.
- [Step 1 공부](LEARNING_STEP_01_CONSOLIDATION.md) · [고객 SVG 시안](assets/customer-consolidation-wireframe.svg) · [운영자 SVG 시안](assets/operator-home-hub-wireframe.svg).
- **현재 미구현:** 상품 여러 개의 실제 후보 생성, 사업주 자택 입고 DB/운영 화면, 실제 관세/운송사 계약 요금, 사용자 동의 저장/자동 출고. 추상 알고리즘 문서와 순수 함수 테스트를 실제 배송 기능 완료로 혼동하지 말 것.

## 1. 용어·업무모델 명확화

- **자택 배대지 (Home Hub):** 사업주가 직접 한국 쇼핑몰 택배를 받아 주문과 일치 여부를 확인하고, 보관/합포장/출고하는 물리 공간. 외부 공개 배대지 업체와 동일한 의미가 아니며 현재는 타인에게 공용 주소를 무제한 개방하는 모델이 아니다.
- **3PL:** 수령·검수·보관·포장·출고 등 물류 작업을 위탁할 계약 업체. **미래 확장 플러그인**이며 **초기 알고리즘에서 3PL이 없다는 이유로 후보를 전부 실패시켜선 안 된다**.
- **국내 택배:** 한국 판매처 → 자택 허브 도착. 여러 판매처면 여러 국내 운송장이 발생한다.
- **합배송(Consolidation):** 같은 적법한 수취인에게 보낼 여러 소유 상품을 하나 또는 적은 수의 국제 운송 박스로 묶는 행위. 각 상품의 원산지/가격/품명/수량/분류는 **합포장하더라도 개별 명세**로 유지.
- **분할배송(Split shipment):** 상품 중 일부를 먼저 또는 다른 박스로 보내는 행위. 지연·취급제한·비용상 이익이 있을 때 고려. 관세 회피를 위한 허위 분할·언더밸류 금지.
- **다중배송 추천:** 하나의 고객이 같은 목적지로 여러 주문을 갖는 경우, **주문별 국내 입고시점과 해외 발송 계획**을 합쳐 더 나은 대안을 비교하는 기능. 고객에게는 '합배송으로 절약 예상 금액'과 '더 기다리는 날짜'를 한 쌍으로 제시.
- **DDP:** 정당한 수입자/수출자·운송사·브로커 계약과 세액 근거가 있을 때만 '관세 포함'으로 결제. **Home Hub가 DDP를 자동 보장하지 않는다**.

### 초기 사업 정책

1. 초기 한국 허브 유형은 \`HOME_HUB\` 하나. 시스템 내부 허브 ID \`HUB_HOME_01\`(샘플 식별자, 주소 아님)을 사용하며 실제 주소는 암호화된 운영 설정에만 보관.
2. 국내 쇼핑몰 주문 배송 주소는 허브 주소. **외국 고객이 임의로 한국 허브 주소에 택배를 발송하는 공개 배송대행 서비스는 초기 범위에 넣지 않는다**(나중에 \`CUSTOMER_PURCHASED\` 방식 도입 시 소유권·선입고·무단 택배 처리 정책 필요).
3. 사업주는 직접 국내택배 수령, 주문번호 확인, 검수, 무게/치수 기록, 보관, 포장, 국제배송사 인계, 파손/반송 예외 처리. 소프트웨어는 **해당 사람의 반복 선택 작업을 줄이는 쪽으로** 설계.
4. 수량이 늘었을 때 \`HOME_HUB -> CONTRACTED_3PL\`로 허브 구현을 교체. 전환 전에도 같은 입고·검수·출고·추적 인터페이스를 사용.
5. 자택 사업 가능 여부, 임대차·공동주택 사용 조건, 사업장 신고, 보관/화재/손실 보험, 주소 개인정보, 택배 집하 조건은 운영자가 확인해야 한다. 서비스 화면에는 **자택 주소를 필요 이상 노출하지 않는다**. 법정 사업자 정보 공개 의무를 회피하지 않는다.

## 2. 실제 사람 업무 Work Process — 하루에 무엇을 하는가?

| 단계 | 물리적 작업(사업주) | 컴파일러 자동 작업 | 입력/출력 증거 | 예외 |
| --- | --- | --- | --- | --- |
| H-01 신규 주문 | 없음 | 동일 상품·옵션/SKU 식별, 해외 목적국/배송국가 확정, 구매·통관·대략배송 계산 | \`OrderIntent\`, \`CountryPolicy\` | HS/가격/원산지 미확인 => 견적 대기 |
| H-02 국내 구매 | 실제 자동구매 계약이 없으면 직접 한국 쇼핑몰 발주 | 최적 판매처 추천, 상품·옵션·가격/국내 운임 비교, 자택 주소/입고 코드 제공 | \`DomesticPurchase\`, 판매처 주문번호, 예상 국내 운송장 | 품절/가격 변동 => 재계산/고객 동의 |
| H-03 입고 예정 | 없음 | 구매별 택배 도착예정일/고객별 합배송 후보 그룹 생성 | 판매처·국내 운송장·입고 예정일 | 배송예정 미확인 => 보수적 보관 |
| H-04 택배 도착 | 택배를 받아 운송장/주문코드 확인; 미개봉 사진 필요 시 촬영 | 기존 구매/고객/옵션에 자동 매칭, 중복 입고 방지 | \`InboundParcel\`, 받은 시각 | 주문번호 불일치 => QUARANTINE |
| H-05 검수 | 열어 실제 SKU/수량/색상·사이즈/손상 확인, 사진 기록 | 주문 대비 차이 판단·원산지 라벨 증거 업데이트·문제 알림 | \`InspectionResult\`, 사진/라벨 증거 | 오배송·파손·제조국 변경 => HOLD |
| H-06 보관 | 고객/주문별 보관함/선반에 코드 부착 | 보관 위치·입고일·무료/최대 보관기간·만료일·예상 합배송 대기 저장 | \`StorageBin\`, \`InventoryItem\` | 다른 고객 물품 혼동 금지 |
| H-07 합배송 제안 | 아직 포장하지 않음 | 동일 수취인/주소의 상품들을 분석해 독립/전체/부분/대기 합배송 후보와 실제 비용·시간 비교 | \`ConsolidationProposal\` | 할인 미증빙·규제제약 => 추천 불가 |
| H-08 고객 의사확인 | 없음 | 비용·절감액·지연일 안내, 기존 약정과 달라지면 동의 수집 | \`CustomerConsent\`, 만료/선택안 | 미응답 시 약정된 기존 출고계획 유지 |
| H-09 포장 | 선택안대로 박스 포장, 완충, 봉인 후 실제 중량·가로세로높이 측정 | 상품별 package-item manifest, 실제 무게·부피무게로 재평가 | \`ShipmentPackage\`, 무게/치수/포장사진 | 실측 운임 증가 => 견적 재검토 |
| H-10 통관 확인 | 필요 서류 검수·고객 조치 확인 | 세번/원산지·통관 방식/신고주체/DDP 계약/세액 재검증, 상업송장 초안 생성 | \`CustomsEvidence\`, \`InvoiceDraft\` | UNKNOWN/규정 만료 => 출고 차단 |
| H-11 국제 인계 | 실제 운송사 접수/집하/방문접수 | 적격 운송사 서비스 최저 합법 총비용 선택, 실견적/출고라벨/송장 등록 | \`CarrierBooking\`, \`TrackingNumber\`, 인계증빙 | 집하 미지원/제약 => 차선 경로 |
| H-12 배송 추적 | 예외일 때만 처리 | 서명된 배송사 스캔, 수입통관/배송 지연/주소 오류 알림, 주문별·박스별 표시 | \`TrackingEvent\`, 고객 알림 | 세관 보류/반송/분실 |
| H-13 배송 완료/정산 | 분실·반품 등 예외 대응 | 실제 도착/비용과 견적 편차·보관일수·합배송 절감액 기록, MD 개선 | \`Settlement\`, \`ActualCost\` | 부분배송 완료, 환불 지연 |

**자택 운영에서 중요한 보조 기능:** 택배 물리 스캔(휴대폰 카메라의 코드 인식 또는 운송장 번호 수동 입력), **'오늘 도착한 택배'**, **'오늘 출고할 고객'**, **'합배송 추천'**, **'검토가 필요한 주문'** 운영자 큐. 고객의 주소/주민번호 등은 운영 화면 최소 권한·필요 시에만.

## 3. 합배송 추천의 데이터 모델

### 3.1 구매 주문과 박스는 1:1이 아니다

\`\`\`text
Customer
  └─ Destination / Recipient (confirmed)
       ├─ Order A: item A x1, item B x2
       └─ Order B: item C x1
            ├─ DomesticPurchase A -> InboundParcel A
            ├─ DomesticPurchase B -> InboundParcel B
            └─ DomesticPurchase C -> InboundParcel C
                  ↓ [HOME_HUB: arrival/inspect/hold]
            ConsolidationCandidateGroup (same lawful recipient/address)
                  ├─ Plan S: 3 separate international packages
                  ├─ Plan C: 1 consolidated international package
                  ├─ Plan P: 2 packages (some consolidated)
                  └─ Plan W: wait up to consented deadline, then consolidate
                        ↓ choose/consent/verify actual packed dims
                  ShipmentGroup
                     ├─ Package #1 -> item manifest and tracking
                     └─ Package #2 -> item manifest and tracking
\`\`\`

**주문·국내 발주·입고 택배·국제 박스·통관신고·송장은 모두 별도 엔터티**. 현재 \`PurchaseRequest\`의 단일 URL/단일 trackingNumber는 기존 주문 호환용으로 남기고 additive schema 도입.

### 3.2 핵심 필드

- \`HomeHub\`: internalHubId, **encryptedAddress**, senderBusinessInfoRef, openingHoursForPickup, storageMaxDays, packBenchCapacityPerDay, scale/calibration, addressDisclosurePolicy; providerType=HOME_HUB.
- \`Order\` + \`OrderItem\`: ownerUserId, recipientKey, exactSKU, quantity, originalOrderId, status, promisedLatestDeliveryDate, payment/quote snapshot, allowedConsolidationPolicy.
- \`DomesticPurchase\`: seller, purchaseId, customerOwner, domesticTracking, estimatedArrivalRange, actualArrival, SKU+qty.
- \`InboundParcel\`: domesticTracking, receiptAt, inspection, actualWeight, photos, item-to-order map, quarantine flag.
- \`InventoryUnit\`: orderItemId, verified quantity, actual origin/material evidence, storageBin, damaged/reserved.
- \`ConsolidationCandidate\`: candidateId, groupKey, eligibleItems, createdAt, inputRateVersion, options[] with cost/ETA/legal/pack assumptions and reason codes, expiresAt.
- \`ShipmentPackage\`: itemManifest[], measuredWeightGrams, measuredDimsMm, dimWeight, carrier/service, actualRate, label/booking, tracking, customsDocsRef.
- \`CustomerConsent\`: planId, quoteDelta, deliveryDelta, signedAt, consentExpiry, channel; **고객에게 불리한 변경을 침묵으로 승인처리 금지**.
- \`WarehouseTask\`: receipt, inspect, pack, verify, dispatch tasks; human operator/time/evidence; low-friction mobile UI.
- \`AuditEvent\`: plan chosen/rejected, savings baseline, rule/price/stock version, who changed it and why.

중요: 수취인 조합 키는 고객 계정 하나만으로 만들지 않는다. \`recipientKey = verifiedOwnerId + normalizedConfirmedRecipient + destinationAddressReference + destinationCountry\`; 다른 사람/다른 주소는 조합 금지. 주소 원문을 MD 등 공개 자료나 이벤트 로그에 남기지 않는다.

## 4. 합배송 알고리즘은 자동으로 '언제 같이 보내는 것이 좋은가'를 판단해야 한다

### 4.1 트리거

- 같은 고객이 **두 번째 주문을 완료하거나** 새로운 구매 요청이 확정된 경우.
- 한국 판매처에서 국내 운송장이 발급되고 **입고예정일이 달라진 경우**.
- HOME_HUB에 물건 하나라도 도착한 경우.
- 매일 운영 설정에 따른 고정 시각 (입고 마감·집하 마감 전).
- 고객이 배송기한을 바꾸거나 합배송 동의/거절을 한 경우.
- 운송사 계약 요금·세율·상품 재질/원산지·실측 박스 크기가 변경된 경우.
- 무료보관 종료, 최대 보관일 접근, 입고 지연 또는 통관 규정 유효기간 만료.

트리거마다 **전체 계획을 무작정 재확정하지 않는다**. \`planVersion\`과 현재 결제/발주/포장/운송 상태로 재계산 가능 여부를 확인하고 이미 출고한 상자를 다른 조합에 넣지 않는다.

### 4.2 eligibility hard gates

1. 같은 적법한 실수취인/주소/목적국, 사용자 소유권 확인.
2. 합배송에 포함되는 상품 모두 국내 출고 가능/국제 운송사 취급 적격. 액체·배터리·자석·파손 제품의 동봉 제한, 온도/포장 필요 조건.
3. 모든 상품의 **각 품목별 실제 수량·가격·제조국·세번**이 명세에 유지되고 합포장에 따른 수입신고/과세 방식이 적법함.
4. 최초 고객에게 약속한 배송기한, 보관 최대기간, 환불 조건 및 합배송 동의 범위.
5. 실제로 국내 입고되었거나, 추가 대기를 고객에게 정확한 범위로 제안할 근거 있는 입고 예정일 존재.
6. 이미 예약/인계된 국제 송장의 일관성 유지. 출고 전에도 운송사 취소/변경 수수료가 있으면 포함.
7. DDP/수입자 역할이 변경될 경우 이전의 DDP 보장을 가정하지 않고 경로 재검증.

### 4.3 후보 생성(반드시 포함할 네 가지)

- **S — Separate:** 지금 출고 가능한 상품은 각각 단독 배송. 이후 입고 예정 상품은 해당 약정대로 발송.
- **C — Consolidate all:** 배송 기한 내 모두 도착하고 안전·법적으로 동봉 가능한 경우 1박스로 발송.
- **P — Partial consolidation:** 예를 들어 A+B는 지금 합치고 C는 늦게 따로 보냄.
- **W — Wait for expected inbound:** 현재 재고 A를 일정 날짜까지 보관하고 B 도착 후 합배송. 고객에게 **예상 대기일과 비용 절감액을 쌍으로 제공**.

2~4개 상품 초기 규모에는 제한조건으로 후보를 정리한 뒤 가능한 분할/그룹을 열거할 수 있다. 주문 증가 시 동적계획법/branch-and-bound, bin packing의 시간제한 탐색으로 확장. **첫 상품만 보고 항상 가장 빠른 배송 또는 항상 합배송을 확정하는 탐욕적 로직은 금지**.

### 4.4 비용 구성

\`\`\`text
planCost(P) =
    Σ domesticSellerFreight (이미 지불한 부분은 sunk cost로 실행 전·후 의사결정에 구별)
  + Σ homeHubHandlingCost(receive + inspection + packLabor + material)
  + homeHubStorageCost(선반/공간/일수, 명시된 원가기준)
  + Σ realCarrierRate(package, zone, service, billableWeight)
  + Σ carrierSurcharge(fuel, remote, pickup, size, seasonal)
  + Σ approvedCustomsDutyTax(packageManifest, regime, origin, importer)
  + Σ clearanceBrokerAndDDPFees
  + Σ insuranceAndPaymentFX
  + expectedDamageReturnRiskCost
\`\`\`

- **외부 고객 가격과 내부 비용을 분리:** \`sellerCost\`, \`ourInternalCost\`, \`customerCharge\`, \`serviceFee\`, \`contributionMargin\`.
- **집에서 직접 포장하더라도 노동을 0원으로 취급 금지**. 입고 스캔 시간×평가 단가, 포장재 실비, 작업 공간, 보관비를 내부 원가로 추적. 고객에게 공개하는 비용은 계약/약관에 따른 것만.
- 이미 결제한 국내배송료는 실제 출고 변경의 증분비용 판단에서 중복 계산하지 않는다. 상품 구매처·창고까지 다시 선택하는 시점에는 전체비용 기준으로 비교한다.
- **부피무게**: 서비스별 \`(L×W×H) / divisor\`; 단위(cm/mm), 약정된 올림 단위와 최소 청구중량, 실제 vs 부피 중량 중 큰 것 선택. **포장 전 크기는 추정**, 포장 후 실측하여 반드시 재견적.
- **세금의 금액 및 과세 단위:** 합배송이 수입방식·과세가액·추가 통관료·면제 여부에 영향을 미칠 수 있으므로 법률을 피하는 임의 분할을 금지하며 동일 적격조건으로 비용 비교.
- \`grossSavings = separateCustomerDeliveredCost - proposedCustomerDeliveredCost\` (같은 상품/수량/주소, 동일한 서비스 품질/기한 범위 기준). 고객에게 표시할 절감액은 **실제로 고객가격에 반영될 액수**, 내부 노동 절약이나 회사 마진 증가액이 아님.

### 4.5 알고리즘 출력 & 추천 사유

각 후보:
\`{id, includedOrderItemIds, packageCount, packageAssumptions, readyAt, dispatchAt, deliveryWindow, freight, duty, tax, clearance, handling, storage, totalCustomerCost, totalBusinessCost, customerSavingsVsBaseline, extraWaitingDaysVsBaseline, importChannel, ddpEligibility, constraintsPassed, rejectionReasons, evidenceRefs, rateExpiresAt, confidence}\`.

선택:
- 먼저 필수 법적·계약·제품 호환·보관/배송 기한 조건으로 후보 제거.
- 남은 후보 중 **고객 총 부담액이 가장 적은 것**을 추천하되, 배송 예상 기한 차이가 있다면 **일수와 절감액을 명확히 제시하고 고객에게 동의**받는다.
- 고객 선택이 없거나 동의 정책 범위 밖인 경우, 고객에게 약속한 기존 출고 조건을 유지한다.
- 예상 절감액과 실제 절감액을 구분하여, 실측·최종 운임/세금 확인 후에만 \`VERIFIED_SAVINGS\`를 표시.
- 출력은 \`RECOMMEND_CONSOLIDATE\`, \`RECOMMEND_SPLIT\`, \`RECOMMEND_SEPARATE\`, \`RECOMMEND_WAIT\`, \`NO_VERIFIED_SAVINGS\`, \`REVIEW_REQUIRED\` 중 하나.
- 고객의 빠른 배송 목적과 저렴한 배송 목적을 무시한 자동 확정 금지.

### 4.6 구현 가능한 의사코드

\`\`\`ts
function recommendShippingPlan(items, recipient, homeHub, quotes, now) {
  const eligible = items.filter(item => belongsToRecipient(item, recipient));
  const constraints = deriveConstraints(eligible, recipient, now);
  const candidatePartitions = enumeratePartitionsWithWaitingOptions(eligible, constraints);
  const evaluated = [];

  for (const partition of candidatePartitions) {
    if (!legalForConsolidation(partition, constraints)) continue;
    if (!withinPromisedDates(partition, constraints)) continue;
    const packageEstimates = estimatePacking(partition, homeHub);
    // Estimates are NOT final dimensions.
    const rates = findContractedCarrierRates(packageEstimates, quotes);
    const customs = calculateVerifiedImportCharges(partition, recipient);
    if (!rates.complete || !customs.verified) continue;
    evaluated.push(scoreFullyLoadedCost(partition, packageEstimates, rates, customs));
  }

  const baseline = selectSeparateShipmentBaseline(evaluated);
  const best = chooseLowestCustomerCostWithinApprovedSla(evaluated);
  if (!best) return { decision: "REVIEW_REQUIRED", reasons: missingEvidence(eligible) };
  return proposeWithSavingsAndWaitTime(best, baseline);
}
\`\`\`

**주의:** baseline은 합배송과 동일한 상품/수량/법적 적격성/고객이 동의한 조건으로 재계산되어야 한다. baseline 평가 자체를 할 수 없다면 절감액을 표시하지 않는다. \`estimatePacking\`은 실제 박스 크기를 자동 보증하지 않는다.

## 5. 추천을 보여주는 고객 화면 & 집에서 운영하는 관리자 화면

### 고객: 게스트/로그인 공통 상품 선택 시
- 제품·수량·옵션·목적국과 **국별 수입 가능/관세/총도착비**(검증 완료/부분/불명 구분).
- '이 상품은 기존 주문과 함께 보낼 수 있어요'는 **로그인으로 동일 수취인·기존 주문 확인이 끝난 경우에만**. 비로그인 고객에게 다른 고객 주문 정보 공개 금지.
- 합배송이 조건을 충족하면 \`Save $X by shipping together\` / \`合并包裹预计节省 ¥X\` 등 언어·통화별 **검증 수준을 표시한 문구**.
- 상세 설명: 어떤 상품을 합배송하는지, **얼마나 절약하고 며칠 더 기다릴지**, 예상 도착 범위, 동의/거절, 추천의 가격 근거 시각.
- 운송사명/배대지 주소의 상세 선택 메뉴는 기본 화면에서 제거. 단 고객이 배송을 추적할 때 실제 carrier/tracking 상세정보 제공.
- 배송비/세금이 미확정이면 '합배송이 가장 저렴' 배지 대신 \`비교 중/검토 필요\`.

### 고객: 로그인 주문 대시보드
- 활성 주문/배송 현황이 첫 영역. **합배송 가능 후보가 존재하면 운영자가 승인한 제안**을 '할 수 있는 행동'으로 제시.
- 고객이 A/B 주문을 합배송 동의하면 기존 주문번호를 유지하면서 새 \`ShipmentGroup\`에 포함하고, 둘 다 하나의 국제 추적을 공유할 수 있음을 설명.
- 분리 배송은 국제 운송장 여러 개 및 각 박스별 ETA/통관 상태가 나타나야 한다.
- 합배송으로 출고가 미뤄지면 '배송 지연'을 숨기지 않고 **고객 동의한 합배송 대기**로 정확히 표시.

### 1인 운영자: Home Hub Console
- **Inbound Today**: 국내 운송장번호·예정/실제 도착·구매처·고객주문 매칭, 스캔/검수/보관 위치.
- **Consolidation Opportunities**: 후보별 묶을 주문, 원가/고객절감, 추가대기일, 실제 박스 크기 확인 필요, 고객 동의 여부, DDP/통관 적격성.
- **Pack & Dispatch Today**: 포장 항목 체크, 실제 무게/치수 입력, 적격 운송사 최저가 재평가, 통관 서류/신고주체, 라벨/픽업/송장 처리.
- **Exceptions**: 오배송/파손, 원산지·SKU 불일치, 판매처 품절, 수입 허가/HS 미확정, 운임 만료, 고객 동의 대기, 국제 택배사 거절.
- **Financial Reconciliation**: 견적 vs 실제 매입/운송/관세/포장 비용, 고객에게 약속한 절감액, 내부 사업 기여이익.
- 초기에 운영자가 휴대폰으로 **'도착 → 검수 → 무게/치수 → 포장 → 출고'**를 5개 상태 버튼으로 처리할 수 있으면 충분하다. 복잡한 WMS/3PL SaaS 도입은 필요 없다.

## 6. 합배송 수치 사례 (오직 가상 테스트값)

### 예시 A: 합배송이 실제로 싼 경우

고객 주문 A 티셔츠: 국제배송 18,000원. 주문 B 문구류: 16,000원. 주문 C 앨범: 20,000원. 개별 합계 54,000원. 한 박스 국제운임 29,000원 + 포장자재/작업비 3,000원 = 32,000원. 동일 수취인/주소/수입 적격, 같은 배송 약속과 세금·기타비용 동일 가정하에서 **22,000원 고객 절감 가능**. 다르면 해당 차액을 포함해 재계산한다.

### 예시 B: 입고 대기 vs 속도

오늘 A 입고. B는 3일 후 입고 예상. A 단독 지금 발송 18,000원, B 단독 발송 16,000원 = 34,000원. B를 기다려 합배송 운임 23,000원 + 포장 3,000원 = 26,000원. **8,000원 절감 가능하지만 A의 출고는 3일 늦어짐.** 고객 화면에 “예상 8,000원 절약, 첫 상품 3일 추가 대기”라고 같이 제안; **자동 대기는 고객 동의 정책 범위 안에서만**.

### 예시 C: 합배송이 더 비싼 경우

개별 두 박스 18,000원씩 = 36,000원. 합배송이 큰 박스를 요구해 부피무게 운임 42,000원 + 포장 3,000원 = 45,000원. 이 경우 **별도배송** 추천, 절약배지 금지.

### 예시 D: 일부만 합배송

A와 B는 오늘 입고, C는 8일 지연 예상. 고객에게 5일 이내 출고 약속이 있다면 A+B 한 박스, C는 별도 차후 출고 방안 평가. C 때문에 전체를 8일 대기시키지 않는다.

**모든 시나리오에 적용:** 배송비 외 통관, 보관, 보험, 소비세, DDP, 정품/규정, 고객 동의 차이가 있으면 해당 비용·가능성까지 비교해야 한다.

## 7. SW 요구사항 (기능 완료 기준)

| ID | 우선순위 | 요구사항과 완료 조건 |
| --- | --- | --- |
| HUB-01 | P0 | \`HOME_HUB\` 1개를 운영자 설정으로 지원; 실제 주소 암호화, 공개에 불필요한 자택 정보 미노출 |
| HUB-02 | P0 | 국내 발주번호/운송장과 고객 주문·정확한 SKU/옵션/수량을 연결 |
| HUB-03 | P0 | 수령·검수·보관위치·사진·파손·원산지 증거를 기록하는 간단한 운영 화면 |
| HUB-04 | P0 | 포장 전 예상치 vs 포장 후 **실측** 중량/치수 구분; 실측 시 운임·합배송 재평가 |
| HUB-05 | P0 | 인수된 상품을 고객별·주문별 보관하고 물리 재고와 DB를 대조 |
| HUB-06 | P1 | 향후 \`CONTRACTED_3PL\` 지원을 위한 provider abstraction, **초기 필수 계약 아님** |
| CON-01 | P0 | 동일 수취인의 **여러 주문**에서 합배송 후보를 자동 탐지 |
| CON-02 | P0 | Separate/All/Partial/Wait 후보 생성, 규정·포장·기한/보관 조건 필터링 |
| CON-03 | P0 | 법정 관세/통관·실운임·부피무게·포장/보관료를 포함한 **총도착가 비교** |
| CON-04 | P0 | 고객의 절감액과 **추가 대기일**을 함께 제시, 미확인 값은 검토 필요 |
| CON-05 | P0 | 약속 기한이나 기존 승인 비용이 불리하게 바뀌면 고객 동의 후 선택 |
| CON-06 | P0 | 고객이 거절하거나 미응답이면 기존 출고 약속 유지; 무단 배송 지연 금지 |
| CON-07 | P0 | 국제 배송사가 거절하는 조합, 다른 고객, 다른 주소, 불법 신고 경로를 제외 |
| CON-08 | P0 | 합배송 후에도 품목별 신고가격·제조국·수량·코드·원산지 증거 유지 |
| CON-09 | P0 | 부분배송 완료·해외 운송장 복수·포장 취소/재포장 이벤트 처리 |
| CON-10 | P0 | 동일 이벤트/트리거 중복 실행시 이중 예약·출고·결제 금지, 버전/멱등성 |
| CON-11 | P1 | 목표 함수가 고객 총액과 실제 회사 원가를 별도 계산해 손실 주문/가짜 절감액 방지 |
| CON-12 | P1 | 주문별 추천 수락률, 실절감액, 추가 대기일, 파손/재포장 비용, 1인 운영 작업시간 측정 |
| GEO-01 | P0 | GeoIP는 목적국 추천만, 로그인 배송 주소/명시적 고객 선택이 최종 배송국가 |
| GEO-02 | P0 | 지역별 운임 산정에 필요한 우편번호/주소 없으면 최저가 확정 금지 |
| GEO-03 | P1 | 목적국/언어/통화별 합배송 문구와 관세·DDP 고지 로컬라이즈 |
| OPS-01 | P0 | 운영자 모바일 수령→검수→실측→포장→출고 체크리스트 |
| OPS-02 | P0 | 실제 합법적 통관/DDP·수출입 신고주체/운송사 계약 없으면 자동 출고 잠금 |
| OPS-03 | P0 | 고객/운영자 양쪽에 추천 사유, 사용 요금표/법령 시점, 고객 동의/보류 상태 제공 |

## 8. TDD/Golden test — 최소 22개

| ID | 입력/시나리오 | 기대 결과 |
| --- | --- | --- |
| TC-HUB-01 | 3PL 데이터 없음, HOME_HUB 활성 | 적격 자택 허브 운영계획 생성 가능 |
| TC-HUB-02 | 자택 주소 포함 상품 API 응답 | 불필요한 주소 외부 노출 방지, 법정 고지는 별도 |
| TC-HUB-03 | 운송장 스캔 2회 | 입고 중복 처리 안 됨 |
| TC-HUB-04 | 주문 A SKU와 도착 SKU 상이 | 격리/출고 보류 |
| TC-HUB-05 | 파손 입고 | 정상 재고·합배송에서 제외 |
| TC-HUB-06 | 포장 예상 400g, 실측 800g | 실측 무게로 운임 및 고객 견적 재검증 |
| TC-CON-01 | 같은 계정/수취인/주소 주문 A+B | 합배송 후보 생성 |
| TC-CON-02 | 같은 계정이지만 서로 다른 주소/수취인 | 결합 금지 |
| TC-CON-03 | 개별 배송 54,000, 합배송 운임+포장 32,000 | 모든 동일조건/관세 검증 시 22,000 절감 추천 |
| TC-CON-04 | 개별 36,000, 합배송 45,000 | 별도배송 추천 |
| TC-CON-05 | A 오늘, B 3일 뒤, 합배송 8,000원 절약 | 3일 추가대기와 8,000원 절감 함께 표시 |
| TC-CON-06 | 합배송 고객 승인 전 3일 대기 | 약정 범위 밖 무단 대기 차단 |
| TC-CON-07 | A+B 오늘, C 8일 뒤, 5일 출고 약속 | Partial consolidation 또는 적격 Separate |
| TC-CON-08 | 국제 제한물품 결합 | 잘못된 합배송 후보 제거 |
| TC-CON-09 | 합배송으로 HS/원산지/품목별 신고값 누락 | 출고 차단 |
| TC-CON-10 | 운송사 운임 만료 | verified savings 제거, 새 견적 요구 |
| TC-CON-11 | 중국 일반 우편에 CBEC 할인 계산 시도 | 우대세율 적용 금지 |
| TC-CON-12 | DDP 미지원 운송사만 존재 | 관세포함 배송 보장 금지 |
| TC-CON-13 | 여러 주문 → 한 국제 박스 | 각 주문은 유지되고 공통 박스/송장과 연결 |
| TC-CON-14 | 한 주문 → 두 국제 박스, 하나만 도착 | 주문 전체 배송완료 금지 |
| TC-CON-15 | 입고예정일 변경 | 후보 자동 재계산, 이미 승인·출고된 계획 무단 변경 없음 |
| TC-CON-16 | 고객이 합배송 제안 거절 | 기존 출고 계획 유지 |
| TC-CON-17 | 고객이 합배송 동의 후 가격/배송기간 악화 | 이전 동의 유효성 확인, 추가 동의 또는 보류 |
| TC-CON-18 | 동일 변경 트리거 중복 수신 | 제안/포장/예약 이중생성 없음 |
| TC-GEO-01 | IP=US, 고객 목적국=CN, 배송지=JP | 확정 배송국가 JP 적용 |
| TC-GEO-02 | 미국 ZIP 미입력 | 실운임 최저가 확정 금지 |

**Golden Test:** 위 가상 비용은 알고리즘 테스트용일 뿐 고객 운임이 아니다. 실제 출고 가능한 국가/품목/수입경로는 **관세사 승인 국별 세번·수입방식·세액/통관비 + 운송사 계약 운임 + 실측/포장비**로 시험 벡터를 만들고 해당 범위 100% 일치할 때만 프로덕션 승인. 기존 [CUS 20개](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md) 테스트를 별도 유지.

## 9. 에이전트에게 주는 직접적인 구현 작업 지시

**<u>먼저 3PL 계약 관리 페이지를 개발하지 말고, 집에서 물건 2~3개를 받았을 때 시스템이 언제 하나로 보내야 유리한지 계산하고 고객에게 제시하는 엔진을 구현하라.</u>**

**Work Package A — Home Hub Intake**
- 기존 \`prisma/schema.prisma\`, \`PurchaseRequest\`, \`PurchaseEvent\`, 구매·배송 UI를 유지하며 additive \`HomeHub/InboundParcel/InventoryUnit\` 도입.
- 운영자 화면에 운송장/상품 인수 확인, 검수, SKU/고객 대조, 재고 보관함, 사진/무게/치수 입력.
- **완료:** 실제 외부 물류 계약 없어도 자택 입고→검수→실측을 1인 운영자가 수행할 수 있는 내부 워크플로. 실제 물건을 처리했다는 시험은 별도 기록.

**Work Package B — Consolidation Decision Engine (사업상 핵심)**
- 여러 주문/수취인 동일성 판단과 후보 Separate/All/Partial/Wait 생성.
- 판매처 ETA, home-hub 입고/최대 보관일/포장 작업량, 운송사 계약 요금, 과금 중량, 통관·DDP 조건으로 전체 비용·기한 점수 계산.
- \`ConsolidationProposal\`을 버전과 근거가 있는 **순수 계산 결과**로 생성하고 고객 승인 전에는 기존 출고를 바꾸지 않음.
- **완료:** TC-CON-01~18을 pass, 수치 예시 A~D 결과 정확, 음수 절감액에는 추천 없음.

**Work Package C — Customer Suggestion**
- 비로그인: 새 상품·도착국에 대한 일반적 합배송 가능성만 설명(타인 주문/주소는 조회 불가).
- 로그인 고객: 본인 활성 주문 중 배송지 같은 상품을 묶을 수 있으면 **절약액 + 추가대기일 + 예상배송일 + 선택 이유 + 동의/거절**을 함께 보여줌.
- 영어/간체중국어 메시지 포함, 고객이 배송사/집주소를 선택하지 않음.
- **완료:** 선택/거절/미응답/만료/가격변동 E2E와 실제 합배송 동의 이력 보존.

**Work Package D — Actual Packing and Reprice**
- 고객이 승인한 계획에서 운영자 포장 작업 생성, 모든 SKU 체크, 실측/포장사진, 국제 운송사 실제 견적 재조회.
- 포장 후 DDP/규제/세금 유효성 확인 및 고객 가격/ETA 약속 재검증.
- **완료:** 크기/무게 상승으로 합배송이 비싸졌을 때 계획 재검토, 배송 완료는 서명된 실제 이벤트만.

**Work Package E — 3PL Migration (later, not MVP blocker)**
- HOME_HUB과 CONTRACTED_3PL은 같은 물류 이벤트 인터페이스. 입고·검수·보관·포장/출고 이벤트를 3PL 제공자로 바꿔 끼울 수 있게 하되, 초기에 계약/자체 API 개발 불필요.
- **완료:** 테스트 fixture에서 provider만 바꾸면 합배송 후보/운임을 재계산하고 주문/국별 규칙과 고객 UI는 유지.

**각 작업의 PR 보고:** 사용자가 보는 이전/이후, 실제 수정 파일, 비용식·후보 선택 근거, 합배송 추천/고객 동의 UX, 1인 물리작업 최소화 효과, 테스트 실실행 결과, 법적/운송사 미계약 경계와 남은 작업. 새 REST API 신설 자체를 목표로 삼지 않는다.

## 10. 출시 전 운영자 Action Items (자택에서 실제 가능한 것부터)

1. 자택을 물류 거점으로 활용할 수 있는지 사업장/주택/임대차/공동주택 규정 확인, 물품·개인정보 보관 위치·보험 및 안전검토.
2. 작업공간 구성: 선반+고객/주문 라벨, 택배저울(정확도 확인), 줄자, 포장대, 2~3종 박스·완충재·테이프·라벨출력 또는 인쇄, 사진 기록 도구.
3. 사업주 송하인 정보, 자택 주소의 접근권한/고지 범위, 국내 판매처의 배송주소 입력 규칙·입고 ID 부여, 반품/미확인 택배 처리 정책.
4. 국내 발주 시작 시 상품 URL·판매처 주문번호·국내운송장·고객주문/옵션을 맵핑할 **입고 대장** 확보.
5. 초기 안전한 품목군 선정(예: 책/문구/일반 의류; 품목·브랜드 정품/규정 검증 필요), 위험물/의약품/식품 등 기존 제외 범위 준수.
6. 실제 국제배송 경로(우편/특송) 2개 이상에 대해 USA/CN/JP의 **허용 품목/운임 조회 가능성/집하 방식/DDP/통관사 수수료** 확보; DDP 계약이 없으면 미확정으로 유지.
7. 같은 품목 3개 기준 개별/합배송 **가상 테스트**, 이후 실제 낮은 위험 상품으로 무게·부피무게·비용 차이 측정; 고객이 부담하는 운임/서비스 수수료 정책 결정.
8. 고객이 여러 주문을 합배송할 때 추가 대기를 허용할지, 이미 약속한 배송 기한 내 자동 처리할 수 있는지, 동의가 필요한 임계치를 약관에 반영.
9. 실제 취소/환불, 품절, 원산지 불일치, 파손, 합배송 보관 중 분실/화재, 수입통관 실패에 대한 비용/책임과 대응 연락처 명시.
10. 월별 운영 측정: 입고→검수 시간, 포장 시간, 택배 소포 수, 합배송 제안/수락률, **실제 고객 절감액**, 작업 인건비, 출고 지연, 실제 환불비용, 고객 재주문률.

## 11. 정의한 성공 기준

- 집으로 국내택배 여러 건이 왔을 때, 고객 계정과 SKU를 정확히 연결한다.
- 시스템은 주문 A와 B가 같은 해외 배송지인지 알아보고 **합배송 추천을 자동 생성**한다.
- 고객과 운영자는 **개별배송 vs 합배송의 실제 비교 조건, 절감액, 추가 기다리는 기간**을 볼 수 있다.
- 고객은 배대지·EMS/DHL/FedEx를 직접 고르지 않고, 본인 권한 안에서 비용·시간 차이를 보고 제안에 동의하거나 거절한다.
- 1인 운영자는 추천된 포장 체크리스트대로 입고·검수·실측·출고를 수행한다.
- 통관 국가별 코드/원산지/수입 방식/신고주체/관세와 DDP 계약을 재검증하고, 송장·고객 주문 상태를 정확히 남긴다.
- 나중에 3PL을 도입하더라도 **고객의 구매 경험과 컴파일러는 동일**하게 유지한다.

**미구현·미계약 항목은 승인 상태로 꾸미지 않는다. 지금은 위를 바로 구현할 수 있도록 요구사항·알고리즘·운영 작업을 정의하는 단계다.**
