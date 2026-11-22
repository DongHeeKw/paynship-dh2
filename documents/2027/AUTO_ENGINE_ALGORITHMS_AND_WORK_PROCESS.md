# PayNShip AUTO-ENGINE — 1인 사업자를 위한 역직구 컴파일러 결정 알고리즘 및 실행 Work Process

> **<u>핵심 제품은 UI가 아니라 '구매처 → 3PL → 합배송 → 수입 적격성/관세/신고주체 → 운송사/서비스 → DDP/고객 도착비용 → 구매·출고·추적'을 실제 데이터로 결정하고 실행하는 자동화 엔진이다.</u>**
>
> **<u>PayNShip = 역직구 컴파일러 + MD 성장 엔진. 고객 URL과 MD 상품 모두 동일 AUTO-ENGINE을 통과한다. 중간 선택은 고객에게 강요하지 않는다. 단 고객이 부담할 총액, 추가비용 가능성, ETA, 합배송으로 검증된 절감액, 정품/상품 정보, 취소·환불/통관 조치 사항은 반드시 노출한다.</u>**

**설계·요구사항. 구현 완료 아님.** 2026-11-22. 우선 목적국 US/CN/JP. 최신 법률/운임/계약 근거 없는 상태에서 자동 구매/자동 통관/관세포함 배송을 시작하지 않는다. **이 문서는 에이전트의 첫 구현 우선순위**이며, 다른 MD의 Day 0·API 중심 작업 안내보다 우선한다. [제품 헌장](PRODUCT_VISION_COMPILER_AND_MD.md), [국가별 CUS 요구·20개 테스트](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md), [현행 상태](../Features/STATUS.md).

## 0. 지금 부족한 것은 '판단'과 '실행'이다

현재 코드는 URL/상품명 부분 추출, 단일 상품 구매 요청, 운영자 통관 견적·상태 처리/서명된 배송 이벤트를 위한 토대를 가진다. **구매처 후보의 실제 가격/재고 비교, 3PL별 계약 요금, 합배송 계산, 미국·중국·일본별 HS 분류와 규제/신고주체 자동 판정, 국제 운송사 실제 계약운임 비교, 검증된 DDP 경로, 실주문/실배송 자동 실행은 아직 검증된 완성 기능이 아니다.** 이를 나중에 할 '플랫폼 추상화'로 미루지 말고 가장 먼저 알고리즘으로 정의·구현·테스트한다.

1인 운영자의 역할을 '모든 주문을 수동으로 처리'에서 '예외·금액 임계치·정책 갱신을 승인'으로 바꿔야 한다. 자동화 범위는 (A) **계산·추천 자동** → (B) **승인된 계약·증거가 있는 자동 실행**으로 분리. 필수 법적 의무/정보가 없으면 명시적 \`HUMAN_REVIEW\`로 간다. 무증빙 자동 구매/원산지 확정/세관 신고를 가장하는 것은 금지.

## 1. End-to-end 입력 → 엔진 출력

### 1.1 고객 입력과 실제 도착 국가

- 방문자가 접속하면 IP의 **국가 수준** GeoIP는 기본 제안 언어·통화·배송국가에만 사용. VPN/프록시/여행 오차, 고객 설정 우선권을 고려하고 IP를 법적 원산지/최종 배송국가로 취급하지 않는다. 필요한 최소 정보만 처리하고 원 IP 장기보존을 지양.
- 우선순위: **확인된 주문 배송주소 국가 > 고객이 직접 선택한 배송 국가 > 계정 기본 국가 > IP 추정 국가**. 마지막 단계는 미확정 \`SUGGESTED_COUNTRY\`.
- 국제 운송 최저가 계산에는 **국가만으로 부족하다.** 실제 우편번호·지역, 실측/예상 포장 크기, 출고창고, 품목/배터리/액체/수입 방식, 배송기한, 보험가입금액, DDP 여부가 필요. 비로그인 상태에는 검증된 지역별 대략 견적 또는 \`NEEDS_ADDRESS\`, 로그인 배송지 확정 시 금액 재계산.
- 고객 필수 선택: **상품(URL 또는 MD 상품), 정확한 옵션, 수량, 배송국가 및 결제 전 배송주소·총액 동의**. 수입자 정보/법적 동의는 해당 국가가 요구할 때만 추가 수집.

### 1.2 내부 입력과 출력

\`\`\`text
Customer intent [URL or MD item, exact variant, qty, destination, deadline]
     └── Product Evidence Resolver [seller ID, SKU, origin, material, weight, authenticity]
          └── Procurement Optimizer [candidate domestic sellers, stock, effective price]
               └── Warehouse Planner [eligible 3PLs, handling, storage, consolidation]
                    └── Trade Compliance Compiler [HS6 + country code, importer, channel, restrictions]
                         └── Freight Router [carrier+service candidates, DDP/DAP, weight, ETA, total fees]
                              └── Joint Plan Optimizer [minimum lawful total cost subject to deadline]
                                   ├── PREVIEW / NEEDS_EVIDENCE / NEEDS_CUSTOMER / HUMAN_REVIEW
                                   └── APPROVED PLAN -> payment -> controlled buying -> 3PL -> carrier
                                        -> signed status events -> reconciliation/returns
\`\`\`

**중요:** 위는 개발 단계를 순차 나열한 것일 뿐 **최적해 계산은 한 번의 단순 연쇄 greedy 선택이 아니다.** 구매처가 바뀌면 국내운임/입고일, 3PL이 바뀌면 지역/재포장비/제휴 운송요금, 합배송이 바뀌면 과금중량/통관방식이 함께 변한다. 따라서 **구매처 × 3PL × 합포장 방안 × 적법한 수입방식 × 운송사/서비스를 결합한 후보 계획**을 평가해야 한다.

**최종 출력 \`ExecutionPlan\`:** exact variants & quantities, verified source sellers, expected domestic purchases, 3PL warehouse, expected receipts, consolidation groups, declared contents & national tariff classifications, chosen lawful importer-of-record/recipient requirements, duty payer/Incoterm, approved carrier/service and rate validity, itemized landed-cost quote, delivery range, savings baseline, evidence freshness, decision explanation, approval/consent status, contingency route, expiring dependencies, immutable plan version.

## 2. 엔진을 구성하는 7개 결정 알고리즘

### E1. Product Resolver — 통관 가능한 정확한 상품 식별

**입력:** URL/MD item, merchant domain, selected size/color/quantity. **출력:** \`ProductIdentity\` + \`EvidenceSet\` + \`MissingFields\`.

Action:
1. URL 정규화 및 접근권한 확인(allowlist, SSRF 차단, robots/약관/허용 API·피드). 네이버 페이지가 막혔다면 우회하지 않고 고객/운영자 검토.
2. merchantProductId, merchantVariantId, GTIN(있으면), maker style code(Nike/Adidas), color code, size; 판매처별 다른 옵션을 동일 SKU로 취급하지 않음.
3. 제조국은 '한국 쇼핑몰에 올라옴'으로 추정 금지. 라벨/공급업체 원산지 증빙, composition/material/ingredients, primary usage, age group, battery/RF/liquid/food-contact 여부, 상품 무게·치수의 **증거 출처/시각/신뢰도** 저장.
4. \`COMPILE_READY\`는 제조국·재질·용도·정확한 옵션/가격·수입국 규칙에 필요한 데이터가 모두 적정 증빙으로 확보된 경우에만. 제목만 있으면 \`PARSED_PARTIAL\`로 UI 표시하고 수동 보완.
5. 상품 변경/버전/옵션 변경 시 기존 세번·가격·통관 판단 자동 무효화.

**Action items:** \`lib/product-evidence/\` 및 \`Product\`의 데이터 출처 현재 구조 파악, 별도 \`ProductEvidence\`/Variant identity 스키마 도입(기존 데이터 호환), Naver/Musinsa/Daiso 20개씩 허용된 출처 fixture, missing fields UI, 정품 소싱 증거.

### E2. Procurement Optimizer — 한국에서 어디서 구매할까?

**입력:** exact SKU/variant/qty, 구매승인 조건, 후보 판매처(공식몰/공인대리점/검증 쇼핑몰), 3PL 후보 및 배송 마감. **출력:** 구매처별 실제 유효 가격과 재고·기한·위험을 포함한 \`SellerOption[]\`.

- 후보 생성: 동일 브랜드/동일 상품 ID 또는 정확한 스타일+색상+사이즈(모호한 경우 매칭 금지), 인증된 실제 판매처만.
- **하드 게이트:** 정품 증거/판매처 적법성, 옵션·수량 재고, 구매 가능 지역/결제수단, 최대 수량·주문 한도, 가격 출처 신선도, 국내 배송 수령 가능, 반품 가능성 확인.
- **구매 총원가:** \`unitEffectivePrice × qty - applicableDiscount + merchantShippingTo3PL + paymentProcessing + expectedDomesticHandling + returns/qualityRiskReserve\`. 쿠폰·회원가격은 실제 적격 계정에서 사용 가능하다는 계약/근거가 있어야 반영; 가상 환급액 반영 금지.
- 시간 평가: \`sellerDispatchETA + domesticTransitETA + warehouseIntakeETA\`; 늦는 매입처는 더 저렴해도 고객 배송기한을 위반하면 제외.
- 여러 판매처가 같은 정확한 상품을 갖고 있으면 1곳 일괄/2곳 분할 매입을 둘 다 후보로 생성. 각 구매처 선택은 차후 3PL/국제배송비까지 넣은 **전체 계획 평가**에서 결정.
- 평가식 예: \`landedPlanCost + λ_delay·max(0,expectedArrival-promisedDeadline) + λ_failure·expectedFailureCost\`. 단 **불법/배송기한 위반은 페널티가 아니라 제거하는 제약**.
- 정품 확인: 공식몰/공식 입점/검증 판매처 영수증·품번 증빙. 단순 이미지 일치로 정품 확정 금지.
- 구매 실행 전 판매처 실재고·금액·옵션 재조회, 사용자의 확정 견적 대비 비용 변화 임계치·정책 재검증, 승인 계약/수단으로 자동 발주 가능할 때만 발주; 주문번호/영수증/처리 idempotency 저장.
- 구매 성공 여부 불명시 재시도 자동 발주 금지: 공급사 주문번호/결제내역 대조 후 재개.
- 판매처 품절 시 후보 재탐색 → 새 비용/ETA 계산 → 고객 동의 또는 환불. 임의 브랜드/사이즈 대체 금지.

**Action items:** 후보 공급처 레지스트리, SKU identity match, 가격/재고 관측 이력 및 TTL, 후보 조합 탐색기, 발주 전 동의·승인 gate, merchant confirmation record, 품절/가격변동 exception; 초기 **자동 '선정'과 수동 '발주'를 분리**한 뒤 적법한 채널에만 자동 발주 활성화.

### E3. Warehouse / 3PL Optimizer — 어떤 한국 창고를 선택할까?

**입력:** 구매처 출발지, 3PL 후보/계약 요금, 제공 서비스, 통관 서류·출고 운송사 서비스 가능 지역, 입고 예정일·상품 제한. **출력:** \`WarehouseOption[]\`.

- **하드 게이트:** 3PL과 실제 계약, 주문자별 식별 가능한 입고 주소/입고 참조번호, 상품 종류 수취 허용, 실측·사진·검수·재포장·반품처리 기능, 보관용량, 보안 및 손실 책임, 운송사 픽업 가능, 창고 기준 출고마감.
- 평가 항목: 국내배송비(판매처별), 입고/검수 단가, 재포장/합포장비, 보관비(일당×예상 일수 + 무료기간), 출고 수수료, 폐기·반송 비용, 창고별 계약 운송사 할인율, 픽업비, 사고율/처리 지연.
- 3PL 비용 공식: \`Σ domesticToWarehouse + Σ receiving/inspection + holdingDays × storageDaily + repack + outboundHandling + carrierPickup + expectedLossReserve\`.
- 창고 계약 시 **수취인 창고 주소를 고객에게 고르게 하지 않고 내부 매핑**; 한국 판매처 구매 시 지정 3PL의 고객/주문별 입고 코드를 자동 부여. 여러 주문을 동일 고객 박스로 합칠 때 반드시 소유권과 주소가 일치해야 한다.
- 판매처 직접 해외배송이 적법하고 총비용이 더 낮다면 3PL을 거치지 않는 **direct ship**도 별도 후보로 평가하되, 검수/증빙/신고주체 책임을 문서화.
- 창고 상태 \`EXPECTED -> ARRIVED -> INSPECTED -> PACKED -> HANDED_OVER\`, 각 상태에 출처·시간·SKU·수량·사진(적정 권한) 기록.
- 3PL 선택이 어려우면 한 곳과 먼저 **실제 계약하고 검증 가능한 SKU/노선**으로 출발. 다른 창고를 다수 등록했다고 실제 물류비 절감이 되는 건 아니다.

**Action items:** 3PL 계약 비교표, 3PL capability matrix, 창고별 SLA/수수료/픽업 테이블, 입고번호 생성 규칙, 상품 일치/파손 검수, 출고·반품 담당, 3PL 미응답/지연시 fallback, 재고 수량 reconciliation.

### E4. Consolidation Optimizer — 무엇을 언제 합배송할까?

**입력:** 고객/수취인 ID, 동일 도착지, 각 상품의 포장 후 실제중량·치수·입고시각, item-level customs data, 제한물질/상품 취급 조건, ETA, storage, 3PL packing capacity, carrier dimensional formula, 고객 승인된 최대 대기시간. **출력:** \`PackagePlan[]\`.

- **하드 게이트:** 다른 고객·다른 수취인/승인 주소 임의 혼합 금지; incompatible goods, 제한 물품, 세관 신고방식 부적격, 통관 규정 회피 목적의 허위분할 금지. 상품별 상세 신고가 가능한지 확인.
- 후보: 각각 배송 / 전량 합배송 / 2+1 등 부분 합배송 / 출고 시점 조정(고객 배송기한 내에서만).
- 적재: 각 상품의 실제 크기·파손/액체·무게 중심을 고려한 포장 규칙. 최소 단순 구현은 1-박스·2-박스 후보 및 측정/재포장 비용; 이후 bin-packing/branch-and-bound / MILP / 제한시간 휴리스틱.
- **단순 부피 합만으로 포장치수를 확정하지 않는다.** 검수·포장 후 실측과 배송사 규칙 재적용.
- **chargeableWeight** \`max(actualWeight, volumetricWeight)\`, 부피무게 공식/과금 중량 올림 단위는 해당 carrier/service/rate version별 저장. DHL의 일부 Express 서비스에서 \`L×W×H(cm)/5000\`를 사용하나 전 운송사 공통 상수로 하드코딩하지 않음.
- **비교 원가**는 국제운임 외에 각 시나리오의 국내배송·창고 입출고·검수·포장·보관·관세·통관비·보험·반품 위험·지연 기회비용까지 포함.
- \`verifiedSavings = comparableSeparateTotalCost - selectedPlanTotalCost\`. 양수이고 동일 품목·수량·주소·배송기한·적법성·가격 근거가 유지될 때만 고객에게 절감액 표시. 차감액이 음수면 합배송을 강제로 선택하지 않는다.
- 출고 결정은 '모든 제품 도착'만을 기다리지 않는다. 대기일 경계, 상품 지연, 배송사 cut-off와 합배송 절감액을 매번 재평가. 지연 위험이 커지면 분할배송.
- 국제 과세가격·수입방식·면제 기준을 왜곡할 목적의 임의 분할/값 낮추기는 금지.

**Action items:** \`ShipmentGroup\`, \`ShipmentPackage\`, \`PackageItem\` 모델, package dimension source, compatible matrix, consolidation candidate generator, rate comparisons, storage/deadline guard, actual receipt→measured re-optimize, customer savings display.

### E5. Customs & Importer Decision Engine — 누가 어떤 방식으로 신고할까?

**입력:** SKU·제조국·성분/용도·수량·실판매가·포장/운임·보험·목적국·고객 법적 지위·신고 경로·배송사/브로커 수입자 지원. **출력:** \`TradeComplianceDecision\` & \`DutyTaxAssessment\`.

1. 상품 ID 및 국가별 HS 분류: **HS6 후보 ≠ 미국 HTSUS10 ≠ 일본 9자리 ≠ 중국 국가 세칙번호**. 정확한 국가별 세번을 검증된 공식 세칙/분류 근거 및 승인자와 연결.
2. 제조국·판매국·발송국을 분리: 한국 구매 나이키가 베트남산일 수 있다. 원산지 증거가 없으면 추가관세/FTA 자동 적용 금지.
3. 수입 방식별 경로: US 우편/특송 및 formal/informal 조건, 일본 국제우편/특송/일반화물, 중국 개인우편·적격 CBEC·일반무역. **중국 국제우편에 자동으로 CBEC 우대세율 적용 금지**.
4. 규제 gate: 미국 FDA(일반 화장품에 식품 Prior Notice를 강제하지 않음)/CPSC/FCC, 일본 화장품 약기법/식기/전기, 중국 NMPA/CCC·CBEC 상품 허용목록/전자상거래 기록. 상품별 문서 필수 목록 생성.
5. **신고주체 결정**: \`ImporterOfRecord\`, \`ExporterOfRecord\`, 적법한 통관사 위임 주체, 고객 동의/법적 인식, 필요한 세관/개인식별번호 종류, 브로커가 해당 경로를 실제 지원하는지. 세관 번호를 사람의 전화번호나 무관한 한국 개인통관번호로 대체하지 않는다.
6. **DDP feasibility**: 계약 운송사/브로커가 목적국에서 적법한 수입통관·관세선납/수입자 의무를 수행 가능하고 승인 비용 증빙이 있는 경우에만. **DDP는 단순 '관세를 미리 받음'이 아니라 실제 수입통관 의무와 책임의 배분**이다. DAP는 비용 부담이 달라질 수 있으며 투명한 별도 동의 필요.
7. 법정 평가가격/관세 계산은 국가·세번·시점·원산지·수입방식에 따른 과세표준/추가관세/소비세 등으로 별도 산출하고 통화별 반올림·환율 증빙. 운송사 통관/대납 수수료는 법정 관세와 혼동하지 않는다.
8. 규칙 버전(효력 시작/종료·확인시각·공식 출처·검토자), quote validity, before purchase/dispatch expiry re-check. 미국 2027 제도 변경도 **실제 공식 효력일** 기준. 이미 결제된 금액은 몰래 소급수정 금지.
9. 미확인·금지품목·국가/브로커 미지원·인증 불명·DDP 부적격은 \`REVIEW_REQUIRED\` 또는 \`ROUTE_UNAVAILABLE\`, 절대 \`duty=0\`으로 채우지 않음.

**Action items:** [CUS-01~14/US-01~08/JP-01~08/CN-01~08](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md) **그대로 구현**, 국가/수입방식별 rule version DB, 승인된 HS+원산지 decision, 통관사 계약 및 actual assessment evidence, importer/recipient docs map, DDP/DAP eligibility/settlement, Golden Test vectors, 추가 관세·효력일 회귀 테스트.

### E6. Carrier Router — 어느 운송사/서비스가 실제 최저 총비용인가?

**입력:** 확정 목적지 country/postcode, 선택 3PL 픽업 주소, packages & chargeableWeight, 물품 제약, customs route/importer, DDP 여부, 배송 기한, declared/insured value, 계약 요금표/유효일, 실제 서비스 가능 region. **출력:** 비교 가능한 \`CarrierRateOption[]\`.

- 후보: 계약된 특송/우편/기타 합법 배송사 서비스 각각. **택배사 회사명만이 아니라 서비스 단위**로 비교(economy/express/actual pickup cut-off).
- **하드 게이트:** 해당 출고/목적지 서비스 제공, 픽업/수취인 주소 유효, 무게·치수 한도, 국가 금지/운송 위험물 규정, 필수 통관 문서, 정확한 수입 방식, DDP 가능(요구시), 보험/서명 추적, 배송기한 준수.
- **실제 고객 총 운임** = 운송사 계약 기본요금(권역+과금중량) + 연료 할증 + 원격지 + 보안/주말/피크 + 픽업 + 보험 + 통관 대행/대납 + DDP 수수료 + 실제 창고 출고비. VAT/관세는 해당 품목세목으로 별도 계산.
- 운송사별 공개 표준요금이 곧 **당사 할인 계약요금은 아니다**. 검증된 계약-rate snapshot이 없으면 '최저가 선정 완료'로 표시하지 않는다.
- ETA = 판매처 구매/국내배송+3PL 입고·검수·포장+픽업 cut-off + 국제 운송기간 + 통관 리스크 범위. 경험치 없이 7일 보장 금지.
- 동일 목적국이라도 **우편번호·도시/도서산간·중량·상품·DDP 제공 여부**에 따라 최적 서비스가 다르므로 '미국=무조건 DHL' 같은 국가별 hardcode 금지.
- 운송사 1위 불가시 확인된 2위 후보 재평가. 유효기간 지난 가격은 다시 조회, 금액 변경 시 주문 정책에 따라 고객동의 또는 보류.

**Action items:** Carrier/Service/RatePlan/RateZone/RateTier/Surcharge/RestrictedGoods/TransitSLA/ContractVersion/TrackingAdapter 데이터 모델, rate table ingestion or permitted quote integration, service coverage, chargeable-weight tests, carrier selection explainability, monitoring, fallback/hold, order-time snapshot.

### E7. Joint Plan Optimizer — 전체 비용과 이행 가능성을 동시 결정

**핵심 논리:**

\`\`\`text
candidates = all exact-SKU, in-stock, authorized sourcing options
for sourcingPlan in feasibleSourceCombos(candidates):
  for warehouse in eligible3PLs(sourcingPlan):
    for packageGrouping in legalConsolidations(sourcingPlan, warehouse):
      for importRegime in eligibleCustomsRoutes(destination, items):
        customs = verifyCustoms(items, origin, importRegime, importer)
        if customs not VERIFIED: continue
        for carrierService in feasibleCarrierServices(warehouse, packageGrouping, destination, importRegime):
          if any blocked goods, unsupported DDP, unknown required charge, or missed promised deadline: continue
          landedCost = actualPurchaseCost(sourcingPlan)
                     + domesticShip(sourcingPlan, warehouse)
                     + warehouseIntakeStorageRepack(warehouse, packageGrouping)
                     + internationalRate(carrierService, eachPackage)
                     + approvedDutiesAndTaxes(customs, packageGrouping, importRegime)
                     + clearanceAndBroker(carrierService, customs)
                     + insurance + paymentFX + riskReserve
          record feasible Plan with evidence, ETA, legal importer, cost, provenance
selected = argmin(valid plans, (landedCost, expectedTransitTime, operationalComplexity))
if no plan: NOT_QUOTABLE + explicit missing evidence or manual decision
\`\`\`

**구현 단계:** 초기 공급처 2~3곳 × 3PL 1~2곳 × 배송 서비스 2~4개 × 합포장 후보 1~3개는 **제약으로 pruning 후 완전 탐색**해도 충분히 작을 수 있다. 상품/3PL/배송 후보가 늘면 branch-and-bound, 동적 계획법(bin packing), MILP/CP-SAT 또는 시간제한 beam search를 고려. 초기부터 과도한 복잡성 도입 금지. 그러나 **구매처 최저가만 먼저 선택하는 greedy 알고리즘은 잘못된 결과를 낳으므로 금지**. 후보 생성·비용 계산·법적 제약·plan 선택을 별도 순수 함수로 테스트.

**목표:** 고객 부담 총액을 낮추되, 약속 배송기한과 법적 의무가 하드 조건; 동률이면 ETA와 운영 복잡도를 고려. 플랫폼 기여이익은 별도 검사하여 **가격 덤핑이나 손실 주문 자동 승인 금지**. 고객 savings와 회사 마진을 서로 다른 계산/표시 필드로 관리.

## 3. 1인 운영 Work Process — 정확한 액션과 자동화/사람 개입 지점

| 시간/트리거 | 자동 동작 (엔진) | 사람이 해야 하는 일 | 완료 기준 |
| --- | --- | --- | --- |
| 최초 운영 설정 | 판매처·3PL·운송사·통관사 contract/요금·제약 데이터 로딩, 유효일/품질 검증 | 사업주가 계약·수입자/수출자 역할·통관사 자료 승인 | **실제** 공급처·3PL·운송사·품목별 US/CN/JP 승인 경로 존재 |
| 고객 접속 | GeoIP 국가/언어 **초깃값 제안**, MD 큐레이션 표시 | 없음 | 직접 국가 선택/로그인 배송주소가 항상 우선 |
| URL/MD 선택 | E1 parse/enrich + exact variant & fields check | 누락 필드/근거 불일치 시 증빙 보완 | 고객에게 확인/미확인 필드 노출 |
| 견적 미리보기 | E2~E7 전체 후보 생성·비용·규제 평가, 확정/추정/미확정 표시 | 공식 규칙/3PL 운임 없는 경우 검증 | 근거 없는 0원·관세 포함 주장 없음 |
| 결제 직전 | 유효 재고/가격·환율·국별 규정·DDP/carrier·배송기한 재검증, quote snapshot | 미해결 변경사항 승인/고객동의 정책 검토 | 승인된 금액과 제공자 결제요청 일치 |
| 실제 발주 | 승인 가능한 판매처에 구매 실행, 중복 발주 방지·내역 대조 | 무계약 판매처·비정상 거래만 수동 주문 | 실제 판매처 주문번호/결제 증거 |
| 국내 택배/3PL | 자동 창고 라우팅·입고 예정·입고 이벤트/수량 대조 | 상품 불일치·파손만 검사/에스컬레이션 | SKU/옵션/수량 맞는 입고 증거 |
| 합포장 결정 | 실측 무게/치수로 E4~E7 재계산, cheapest feasible shipment | 배송기한 변화/법령변경 시 처리 | 선택 plan과 버전/절감액 보존 |
| 출고 | 통관 서류/원산지/수입자·DDP 가능성/계약 운임 재검증, 적법 운송사 예약 | 무인증/불가품은 출고 보류 | 송장/인계/통관 참조 |
| 운송 중 | 서명된 이벤트 수집·통관/지연 경보, 주문/박스별 상태 | 오랫동안 미갱신/반송/세관 추가자료만 처리 | 고객 상세조회/조치 통지 |
| 배송 완료 | 확정 운송사 스캔/배달 증거, 예상 vs 실제 비용/시간 reconciliation | 오차·환불/보험 청구 등 예외만 처리 | 실정산/개선 데이터 저장 |
| 주기적 배치 | 가격·재고·운임·환율·통관 규칙 유효기간 모니터, MD 재평가, 운영 예외 큐 | 규정/계약 변경에 승인 | stale badge 제거, 기한 만료 견적 차단 |

**인력 절감 KPI:** 운영자 손대지 않고 종료되는 정상 주문 비율, 주문 1건당 운영자 분, 검토 대기 건수, 미검증 데이터 원인 상위 10개, 실제 도착비용 견적오차, 기한 준수율, 재발주/오배송률, 국가·상품군별 기여이익.

## 4. 필수 데이터 구조 — 무엇을 DB에 넣는가

| 논리 엔터티 | 주요 필드 |
| --- | --- |
| ProductIdentity/Variant | normalized URL, merchant, sourceProductId, sourceVariantId, GTIN/style/color/size, qty, image/brand |
| EvidenceRecord | field, value, sourceURL/sourceType, observedAt, expiresAt, digest, confidence, reviewedBy |
| SellerOffer | exact variant, seller, availableQty, unitCost, couponEligibility, domesticFreight, sellerDispatchETA, returnRule, evidence |
| WarehouseContract | provider, physical warehouse ID, acceptedGoods, region, receiptCost, inspect/repack/pack, dailyStorage, outbound/pickup, SLA, returnCost, version |
| WarehouseReceipt | owner, item SKU, qty, domesticTracking, measuredG/CM, photosEvidence, discrepancy, actualReceivedAt |
| TradeClassification | HS6 candidate, destination, national code, manufacturerOrigin, material, source, ruleVersion, verifiedBy |
| ImportRegime/Importer | country, entryMethod, channelApproval, importer/exporter identity references, broker, requiredDoc/consent, DDP eligible |
| TaxAssessment | taxableValue, currency/rule rounding, baseDuty/additionalDuty/tax/clearance, sourceVersion, validUntil |
| CarrierContractRate | service, sourceWarehouse, destCountry/zone, weight tiers, dim divisor, roundUp, fuel/remote/peak, insurance, DDP handling, max size, SLA, validUntil |
| PackagePlan | shipmentGroup, owner, itemRefs, legal compatibility, measured/expected dimensions, billableWeight, packFee, readyAt |
| CandidateExecutionPlan | sourcingCombos, warehouse, packagePlan, customs path, carrier service, costs, ETA, evidence references, feasible/rejectReasons |
| ApprovedExecutionPlan | selectedPlan, customer quote, consent, committedAt, immutable cost breakdown, version, fallback |
| Package/Tracking/Audit | package ID, carrier/tracking, signed event source/time, customs reference, delivered evidence, exceptions, discrepancy |
| MDCollection/MDItem | country, locale, verified product, recommendation rationale, localPriceEvidence, landedCostEvidence, source refreshedAt |

**DB/기존 시스템 호환:** 현재 \`Product.hsCode\`를 승인된 국별 세번처럼 취급하지 말고 별도 관계로 저장. \`PurchaseRequest\` 하나로 복수 국내발주/복수 배송을 표현하지 말고 별도 item·package 관계를 추가하며 과거 유료 견적·배송상태/결제내역 보존. 돈은 Decimal 또는 정수 최소 통화단위로 계산. 새로운 외부 공개 API를 만드는 게 목적이 아니라 **기존 Next.js/Prisma의 서버 서비스에서 호출하는 순수 엔진**을 구축하는 게 목적.

## 5. 에이전트에게 명시하는 코드 작업 패키지(우선순위는 알고리즘 기준)

### W1 — 상품 정확성/데이터
**코드:** \`lib/product-evidence/\`, \`features/storefront/\`, \`app/purchase/\`, \`prisma/schema.prisma\` 및 기존 검토 화면. 
**작업:** SKU/variant fingerprint, origin/material/weight evidence, 필드별 confidence/freshness, 누락/불일치 표시, manual fallback.
**인수조건:** 제목만 파싱한 페이지는 \`PARSED_PARTIAL\`, 한국 쇼핑몰의 베트남 제조 상품은 VN, 국가 변경/옵션 변경 시 견적 무효화.

### W2 — Procurement engine
**코드(새 내부 모듈 제안):** \`lib/compiler/procurement/\` + 판매처 증빙/운영자 승인.
**작업:** 동일상품 후보 오퍼 매칭/가격·재고/국내배송·ETA/정품 gate, 후보 조합 생성, 공급처 변경 시 3PL·관세·배송 재계산.
**인수조건:** 가장 싼 단가 판매처와 전체 도착비 최저 후보가 다를 때 **전체 도착비 최저**를 선택. 미승인 판매처 auto-order 금지.

### W3 — Warehouse engine
**코드:** \`lib/compiler/warehouse/\`, 3PL contract/rate/receipt models.
**작업:** 3PL 서비스 가능성·입고/검수·보관/재포장/픽업/출고요금, 입고 식별자, 재고/손상 처리.
**인수조건:** 창고가 저렴해도 운송사 픽업 미지원이면 제외. 미계약 3PL 비용으로 최적 후보 확정 불가.

### W4 — Consolidation & packing optimizer
**코드:** \`lib/compiler/packing/\`, \`ShipmentGroup/PackagePlan/PackageItem\`.
**작업:** 합/분리 배송 후보, 안전 포장 제약, 부피무게/과금 중량, 총비용 절감/배송기한, 실측 도착 후 재최적화.
**인수조건:** 합배송으로 부피무게가 증가하여 더 비싸면 별도 배송 선택. 절감액을 고객에게 입증 가능하게 표시.

### W5 — Country customs/DDP compiler
**코드:** 기존 \`lib/customs/\`, 새 \`lib/compiler/compliance/\`, 공식 세칙/브로커 승인 데이터.
**작업:** CUS-01~14, US/JP/CN 국가 분류, 수입 방식/수입자/규제, 세목 계산 및 DDP 계약 적격성.
**인수조건:** [국가별 테스트](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md) 및 국가별 Golden Case. 중국 일반우편을 CBEC로 취급하지 않고 FDA 식품 Prior Notice를 립틴트에 일괄 적용하지 않음.

### W6 — Carrier router + Joint optimizer (엔진 핵심)
**코드:** \`lib/compiler/carrier/\`, \`lib/compiler/plan/\`, 실제 운송사 계약 요금 데이터.
**작업:** 주소/무게/서비스/제약/추가수수료별 후보 요금표, joint search, plan reason, validity/consent, fallback; 1인용 실패 큐.
**인수조건:** 구매처/3PL/운송사·합배송을 전역 최적화. DDP 불가능하거나 관세 미확인인 계획은 후보 제외. 기본 언어/국가 GeoIP는 미확정 제안에만 사용.

### W7 — 실제 운영 실행 및 MD/UI 통합
**코드:** 기존 결제·구매/배송 webhook, 로그인 주문 상태, \`features/storefront/\`, 국별 로케일.
**작업:** approved plan에서 실제 국내 구매/3PL 인계/송장/업데이트/환불까지 연결. 고객은 전체 요금·도착일·절감액·정품·통관정보/환불조건을 보되 회사 내부 선택 화면은 보지 않음. MD 상품도 동일 compiler 사용.
**인수조건:** 영어 미국/간체중국어 방문자의 게스트·로그인 플로우; 실제 운송사/브로커 계약 없이 DDP 성공 배지 표시 금지.

## 6. 반드시 만드는 단위/통합/최적화 테스트

| ID | 실험 입력(모든 숫자는 **가상 테스트 데이터**) | 기대 결과 |
| --- | --- | --- |
| ENG-01 | IP=US, 고객 수동 선택=CN, 실제 확인 주소=JP | 배송국가 JP; 국가별 통관 계산 JP, IP는 언어 초깃값만 |
| ENG-02 | 구매처 A 단가 20,000/국내배송 10,000, 구매처 B 단가 23,000/국내배송 2,000 (기타 비용 동일) | B 선택. 단가 최소화가 아니라 전역 총원가 최소화 |
| ENG-03 | 3PL A 입고 1,000 + 해외운임 30,000, 3PL B 입고 5,000 + 계약 해외운임 20,000 | B 선택(기타 조건 동일) |
| ENG-04 | 2개 상품 각각 해외운임 18,000 vs 합배송 운임 28,000+포장 3,000 | 합배송 31,000; **비교 조건 동일하면** 5,000 절감 표시 |
| ENG-05 | 2개 합배송 후 실제/부피무게 영향으로 운임 42,000+포장 3,000, 개별 36,000 | 합배송 거부, 2개 개별 배송 후보 선택 |
| ENG-06 | Carrier X 운임 12,000이나 DDP 불가, Carrier Y 18,000 DDP+필수 통관 요건 충족, 고객이 확정 DDP 요청 | X 부적격, Y 선택 |
| ENG-07 | 국가=US만 있고 ZIP이 없는 비로그인 사용자 | 지역별 확정 최저운임 주장 금지; 배송국가 제안/대략 견적과 주소 필요 안내 |
| ENG-08 | 베트남 제조 나이키를 한국 공식 판매처에서 구매 | 제조국 VN으로 HS/관세·원산지 평가 |
| ENG-09 | 중국 국가 목적지, CBEC 미승인 일반우편 | CBEC 세율 자동 적용 금지, 검토/적법 경로 제안 |
| ENG-10 | 항목 HS6만 있고 US HTS10 승인 없음 | 고객 UI에 통관 검토 필요, 결제 잠금 |
| ENG-11 | 동일 상품이 MD 카드와 URL로 들어옴 | 동일 variant/evidence/country 규정으로 같은 견적 |
| ENG-12 | 국별 통관 규칙 또는 운송사 계약가격 만료 | 새 계획 자동 승인/결제 금지, 재검증 큐 |
| ENG-13 | 판매처 발주 중 timeout + 동일 재시도 | 판매처 주문/결제 확인까지 중복 구매 금지 |
| ENG-14 | 1개 상품만 배송 완료, 같은 고객 주문의 2번째 박스 미완료 | 전체 주문 배송완료 표시 금지 |
| ENG-15 | 파손/원산지 불일치가 3PL 입고 중 발견 | 자동 출고 보류, 고객/운영자 알림 |
| ENG-16 | 입력 운임/상품금액을 브라우저가 변조 | 서버 원본 계획·금액/버전과 달라 결제 거부 |
| ENG-17 | 승인된 관세 Golden Vector와 계산 1원 차이 | fail; 공식 반올림/과세 기준 재검토 |
| ENG-18 | 3PL 무료 보관 이후 하루 추가 시 비용 증가 | 새 보관일수와 ETA 적용, 재최적화 |
| ENG-19 | 동일 수취인이나 배터리 취급 제한이 다른 두 제품 | 호환되지 않는 합포장 제외 |
| ENG-20 | 법령·계약·재고 미확인인 가장 저렴한 계획 | 후보 제외하고 사유 표시, 무증빙 auto-buy 금지 |

**시험법:** E2/E3/E4/E6/E7는 독립 순수함수 fixture → 후보 생성 → 비용 breakdown → 불가 사유 → 선정결과를 deterministic하게 테스트. 국가 통관은 실제 관세사/공식 출처로 승인된 Golden Vector만 production pass. E2E는 guest → url/MD → preview → login → approved quote → purchase → 3PL → ship → signed tracking → return/exception까지. 실제 연동이 없으면 mock/demo임을 분리해 기록.

## 7. 운영 자료/외부 계약을 반드시 수집할 Action Items

- [ ] 한국 판매처 등록 목록: SKU/옵션·가격·재고·쿠폰 적격성·국내 배송비·발송기한·정품·구매/반품 정책의 실제 자료 출처, 자동 구매 권한.
- [ ] 최소 1개 실제 3PL 계약: 입고 코드, 국내 반품주소, 실측/검수/재포장/사진, 보관료·무료일/최대일, 출고/택배사 픽업, 손실 책임, 실제 주문 1건 재현.
- [ ] 미국·일본·중국 목적지별 국제 운송사 요금표 및 계약: 국가/우편번호 권역·서비스, 무게/부피무게·올림, 할증, 보험, 수입품 취급 제한, 추적, DDP 가능여부, rate valid dates.
- [ ] 국가/상품군별 관세사 확인: HS 국가세번, 제조국·재질 증거, 법정 과세가격, 기본·추가관세·세금·대납/통관수수료, IOR·고객식별/위임, DDP 청구/환급 프로세스.
- [ ] 가상 fixture 20개와 적법한 실제 골든 케이스: 공급처·창고·합배송·관세·운송사 비용의 end-to-end 예상/실측 차이를 운영 리포트에 기록.
- [ ] 미국 영어/중국 간체 MD: 같은 상품이어도 국가별 합법적 판매/총도착가격/세금·배송/반품 안내를 구분. 번역만 하고 무조건 해외배송 가능하다고 홍보하지 않음.
- [ ] 사업주의 하루 예외처리 수용량 상한, 알림 임계치, 승인 로그, 손실 주문 차단·재구매/환불 처리 정책.

## 8. 문서·코드 우선권과 완료 기준

이 문서는 **컴파일러의 비즈니스 핵심 엔진 스펙**이며 [제품 헌장](PRODUCT_VISION_COMPILER_AND_MD.md) 다음 우선. 기존 [Agent Plan](AGENT_IMPLEMENTATION_PLAN.md)의 가벼운 개요는 이 문서에 의해 보강/우선한다. [SW/Test 상세](KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md)는 법/세액·Golden Vector의 필수 수락 기준이다. 다른 문서의 '나중에 사업 로직 구현' 또는 막연한 '시스템이 결정'이라는 표현보다 **여기 정의된 자동 후보 생성·제약검사·비용 최적화·실행·재평가·테스트**가 우선한다.

**완료의 정의:** 실제 승인된 상품/국가 노선 하나에 대해, 고객 URL 또는 MD로 들어온 상품을 정확히 식별하여 국별 수입가능/관세·DDP·구매처·3PL·합배송·운송사를 **알고리즘이 스스로 비교하고 이유와 근거를 남겨 최적 실행계획을 결정**, 고객이 총액·예상배송일·절감액(있을 때)·실추적·취소/환불을 보고, 사업주는 예외만 처리할 수 있는 상태. 외부 계약/규정 미확보 시 해당 부분은 명시적으로 수동 검토·미완성으로 남긴다.

**외부 근거 시작점:** Delivered Korea 공개 서비스 https://www.delivered.co.kr/en/we-buy-and-ship ; DHL 과금중량 https://www.dhl.com/discover/en-hk/logistics-advice/import-export-advice/how-to-calculate-international-express-shipping-costs ; ICC DDP 책임 https://library.iccwbo.org/clp/clp-incoterms-qa-2020.htm ; US https://www.cbp.gov/ ; JP https://www.customs.go.jp/english/tariff/ ; CN https://online.customs.gov.cn/ ; IP 위치 오류 https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy .
