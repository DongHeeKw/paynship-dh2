# PayNShip Competitive & Infrastructure Brief
**Date**: 2026-03-06
**Scope**: 한국 쇼핑 프록시 시장 — 결제/인증, 법적 이슈, 결제 인프라, 경쟁사 분석

---

## Executive Summary

1. **외국인이 한국 플랫폼에서 직접 구매하는 것은 사실상 불가능에 가깝다** — 주민등록번호 기반 인증, 한국 전화번호 필수, 연간 갱신 공인인증서 등이 결합된 진입장벽이 존재하며, 이것이 프록시 쇼핑 시장이 존재하는 근본 이유다.
2. **한국 법인으로 Stripe 계정 개설은 아직 불가능하고, PayPal은 가능하지만 해외→한국 수취만 지원**한다. 현실적 대안은 PayPal 비즈니스 계정 + 해외법인(Delaware C-Corp) Stripe 조합이다.
3. **기존 경쟁사 17개+는 전부 수동(human agent) 기반**이며, AI 자동화를 도입한 서비스는 아직 없다. PayNShip의 LLM 기반 자동화가 차별점이 될 수 있으나, 결제 인프라와 법적 구조 설계가 선행되어야 한다.

---

## 1. 한국 플랫폼 결제/인증 — 외국인 Pain Points

### 1.1 인증 장벽 구조

| 장벽 | 설명 | 심각도 |
|------|------|--------|
| **주민등록번호/외국인등록번호** | 회원가입 및 결제 시 필수. 외국인은 ARC(외국인등록증) 없이 사용 불가 | Critical |
| **한국 전화번호 인증** | 본인인증(PASS 앱, 통신사 인증) 필수. 해외 번호 미지원 | Critical |
| **공인인증서/금융인증서** | 연간 갱신, 한국 은행 계좌 연동 필수. 스마트폰에서는 더 불편 | High |
| **한국 결제수단만 허용** | 대부분 플랫폼이 한국 카드(신용/체크)만 지원. 해외 카드 미지원 또는 극히 제한적 | Critical |
| **PCCC (개인통관고유부호)** | 한국 수입 통관 시 필수. 외국인은 발급 절차 자체가 복잡 | Medium |

### 1.2 플랫폼별 외국인 접근성

| 플랫폼 | 해외카드 지원 | 영어 UI | 외국인 가입 |
|--------|-------------|---------|------------|
| **Coupang** | X (극히 제한) | 부분적 | ARC 필요 |
| **Naver Shopping** | X | X | 한국 번호 필수 |
| **Gmarket Global** | O (제한적) | O | 비교적 용이 |
| **11번가** | X | X | 한국 번호 필수 |
| **무신사** | X | 부분적 | 한국 번호 필수 |
| **번개장터/당근** | X | X | 한국 번호 필수 |

### 1.3 2026년 변화 전망

- **Coupang 패스키 도입 예정 (2026 상반기)**: 로그인 시간 2배 단축 예상이나, 근본적인 외국인 접근성 문제(한국 전화번호, 결제수단)는 미해결
- **은행급 데이터 보안 규정 적용**: 2026년 1월부터 대형 리테일 플랫폼에 은행 수준 보안 규제 적용 → 외국인 가입 절차 더 복잡해질 가능성
- **온라인 플랫폼 공정화법**: 플랫폼 의무 강화 → 직접적 외국인 접근성 개선 효과는 미미

**핵심 해석**: 한국의 인증 장벽은 구조적이며, 단기간 내 해소될 가능성이 낮다. 이는 PayNShip 같은 프록시 서비스의 존재 이유가 지속된다는 의미다.

---

## 2. 크로스보더 직구매 시 법적 이슈

### 2.1 한국→해외 수출(역직구) 관점

PayNShip은 한국 상품을 해외 소비자에게 배송하는 모델이므로, **한국 수출 + 목적국 수입** 양쪽 규제를 모두 충족해야 한다.

#### 한국 측 요건

| 요건 | 내용 | PayNShip 영향 |
|------|------|--------------|
| **통신판매업 신고** | 한국에서 온라인 판매 시 필수 (전자상거래법) | 필수 |
| **수출 신고** | 건당 $2,000 초과 시 수출 신고 필요 (간이수출 가능) | 대부분 간이수출 해당 |
| **지식재산권 침해 금지** | 위조품, 모조품 수출 시 형사 처벌 | 상품 검수 프로세스 필요 |
| **수출 금지/제한 품목** | 전략물자, 문화재 등 | 카테고리 필터링 필요 |
| **개인정보보호법 (PIPA)** | 해외 고객 개인정보 국외 이전 시 동의 필수 | 개인정보 처리 방침 필수 |

#### 목적국 측 요건 (주요국)

| 국가 | De Minimis | 주요 규제 | 비고 |
|------|-----------|----------|------|
| **미국** | $800 (면세) | FDA(식품/화장품), FCC(전자기기) | KORUS FTA: $200 이하 관세 면제 |
| **일본** | ¥16,666 | 식품위생법, 약기법 | 화장품 수입 규제 엄격 |
| **EU** | €150 | CE 마킹, REACH(화학물질), GDPR | IOSS 등록 필요 (VAT 사전징수) |
| **호주** | A$1,000 | GST 10% (A$1,000 이하도 적용) | ABN 등록 권장 |
| **동남아** | 국가별 상이 | 할랄 인증(말레이시아/인도네시아) | K-Beauty 수요 높음 |

### 2.2 PayNShip 비즈니스 모델 관련 법적 리스크

| 리스크 | 심각도 | 대응 방안 |
|--------|-------|----------|
| **대리구매 사업자 자격** | High | 통신판매업 + 구매대행업 신고 (관세법 시행규칙) |
| **PG사 없이 고객 결제 수취** | Critical | PG사 연동 또는 해외 결제 플랫폼 필수 |
| **관세 과소신고 리스크** | High | 정확한 상품가격 신고 시스템 (자동화) |
| **품목별 인허가** | Medium | 식품/화장품/의약품 카테고리별 사전 심사 |
| **환불/소비자보호** | Medium | 한국 전자상거래법 + 목적국 소비자보호법 이중 적용 |

---

## 3. 한국 사업자의 크로스보더 결제 플랫폼 연동

### 3.1 플랫폼별 한국 사업자 지원 현황

| 플랫폼 | 한국 법인 계정 개설 | 해외 결제 수취 | 수수료 | 비고 |
|--------|-------------------|---------------|-------|------|
| **PayPal** | **O** (비즈니스 계정) | O (해외→한국만) | 3.49% + 고정수수료 | 한국 내 결제는 불가. 인출 ₩15만 이상 무료 |
| **Stripe** | **X** (한국 법인 불가) | N/A | N/A | 해외 사업자가 한국 결제를 받는 것만 가능. 한국 법인 Stripe 계정 개설 불가 |
| **Paddle** | O (MoR 모델) | O | 5~7% | Merchant of Record로 세금/VAT 처리 대행. 높은 수수료 |
| **Lemon Squeezy** | O (MoR 모델) | O | 5% + $0.50 | 디지털 상품 특화. 물리적 상품 부적합 |
| **Eximbay** | **O** | O | 약 3.5% | 한국 PG사. 해외 카드 결제 수취 지원 |
| **NICE페이먼츠** | **O** | O (해외카드) | 약 3.0% | 한국 대형 PG. 해외 결제 모듈 제공 |

### 3.2 현실적 옵션 분석

#### Option A: PayPal 비즈니스 (가장 현실적)
- **장점**: 한국 사업자 즉시 개설 가능, 전 세계 200+ 국가 지원, 바이어 보호 프로그램 (신뢰도↑)
- **단점**: 수수료 3.49%+, 한국 내 결제 불가, 분쟁 시 판매자 불리, 인출 시 환전 손실
- **적합도**: PayNShip 초기 MVP에 최적

#### Option B: 해외법인 + Stripe
- **장점**: 낮은 수수료(2.9%), 개발자 친화적 API, 구독/반복결제 용이
- **단점**: Delaware C-Corp 설립 필요($500~2,000 + 연간 유지비), 세무 복잡
- **적합도**: Scale-up 단계에서 고려

#### Option C: 한국 PG사 (Eximbay/NICE)
- **장점**: 한국 규제 준수 용이, 원화 정산, 한국 고객도 결제 가능
- **단점**: 해외 카드 결제 UX 열악, 글로벌 커버리지 제한
- **적합도**: 보조 결제수단으로 활용

#### 권장 조합
```
Phase 1 (MVP): PayPal 비즈니스 계정 단독
Phase 2 (Growth): PayPal + Eximbay (해외카드 직접결제 옵션 추가)
Phase 3 (Scale): Delaware C-Corp → Stripe 도입 + PayPal 유지
```

---

## 4. 유사 사업자 분석

### 4.1 경쟁사 매핑

현재 한국 프록시 쇼핑 시장에는 17개 이상의 사업자가 활동 중이다. 전부 **수동 에이전트 기반**이며, AI 자동화를 도입한 서비스는 확인되지 않음.

| 서비스 | 설립 | 모델 | 수수료 | 특징 |
|--------|------|------|-------|------|
| **KoreanBuddies** | ~2015 | Proxy + Forwarding | $5~12% (주문금액 기반) | 가장 높은 인지도. Bunjang 지원. $15/월 멤버십 |
| **Harumio** | ~2018 | Proxy + Forwarding | $5 flat + 환율마진 | 저렴한 수수료. 중고마켓 지원 |
| **KoreaToMe** | ~2016 | Forwarding 중심 | 무료 한국주소 + 배송비 | 주소 제공 → 직접 구매 유도. Forwarding 특화 |
| **AllThatSales** | ~2019 | Proxy | 10~15% 추정 | Bunjang 특화. 중고 명품 |
| **PINKBOX** | ~2004 | Proxy + Consolidation | 비공개 | 20년+ 경력. 패키지 통합 전문 |
| **Korgou** | ~2020 | Proxy + Assisted | 10% 추정 | K-pop 특화 |
| **Paysable** | ~2022 | Proxy + Payment | 수수료 포함가 | 결제 대행 중심 |
| **Com&Buy** | ~2021 | Proxy | 10% 추정 | Bunjang/중고 특화 |
| **OntactKorea** | ~2020 | Proxy + Forwarding | 8~12% | 종합 서비스 |

### 4.2 비즈니스 모델 유형

#### Type A: 순수 Forwarding (주소 제공형)
- **대표**: KoreaToMe
- **구조**: 한국 주소 제공 → 고객이 직접 주문 → 수령/국제배송
- **수익**: 배송 마진 + 부가서비스(통합포장, 사진촬영 등)
- **한계**: 고객이 한국 사이트에서 직접 결제해야 함 → 외국인 결제 불가 문제 미해결

#### Type B: 풀 프록시 (구매대행형)
- **대표**: KoreanBuddies, Harumio, AllThatSales
- **구조**: 고객이 URL/링크 제출 → 에이전트가 대신 구매 → 국제배송
- **수익**: 서비스 수수료(5~15%) + 환율 마진 + 배송 마진
- **한계**: 수동 처리로 인한 느린 응답(24~72시간), 확장성 제한

#### Type C: 마켓플레이스형
- **대표**: 일부 K-pop 굿즈 전문몰
- **구조**: 직접 재고 확보 → 자체 사이트에서 판매
- **수익**: 상품 마진
- **한계**: 재고 리스크, 제한된 상품 범위

### 4.3 경쟁사 공통 약점 (PayNShip 기회)

| 약점 | 설명 | PayNShip 대응 |
|------|------|--------------|
| **수동 처리** | 모든 주문을 사람이 처리 (24~72h) | LLM 기반 실시간 자동 견적/주문 |
| **불투명한 가격** | 최종 가격을 주문 후에야 확인 | AI 즉시 가격 산출 (배송비+관세 포함) |
| **제한된 커뮤니케이션** | 이메일/폼 기반, 실시간 소통 불가 | 채팅 기반 실시간 상담 |
| **UX 열악** | 링크 붙여넣기 → 견적 대기 → 결제 (다단계) | 원스톱 채팅 인터페이스 |
| **상품 정보 부족** | 스크래핑/번역 없이 원본 링크 공유 | 자동 스크래핑 + 상품 정보 정제 |
| **확장성 제한** | 에이전트 수 = 처리량 상한 | AI로 처리량 제한 없음 |

### 4.4 Positioning Map

```
        높은 자동화
            │
            │       ★ PayNShip (목표 포지션)
            │
            │
   저가 ────┼──────────────────── 프리미엄
            │
            │  KoreaToMe    KoreanBuddies
            │  Harumio      AllThatSales
            │               PINKBOX
            │
        낮은 자동화 (수동)
```

---

## 5. Strategic Implications

### 5.1 Build / Accelerate / Deprioritize

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| **Build** | PayPal 비즈니스 계정 연동 | 결제 인프라 없이는 서비스 런칭 불가 |
| **Build** | 구매대행업 신고 + 통신판매업 등록 | 법적 기반 없이 운영 불가 |
| **Accelerate** | AI 자동 견적 (배송비+관세) | 경쟁사 대비 핵심 차별점 |
| **Accelerate** | 자동 스크래핑 + 상품 정보 정제 | 수동 프록시 대비 즉시 응답 가능 |
| **Deprioritize** | Stripe 연동 | Phase 3에서 해외법인 설립 후 도입 |
| **Deprioritize** | 자체 물류/재고 | 초기에는 3PL 또는 기존 배송 인프라 활용 |

### 5.2 Key Risks to Monitor

1. **Coupang/Naver의 글로벌 직접 판매 확대** — Coupang이 자체 글로벌 배송을 강화하면 일부 상품의 프록시 수요 감소
2. **한국 결제 규제 변화** — Stripe 한국 진출 시 경쟁 구도 변동
3. **AI 경쟁사 진입** — 기존 프록시 업체가 AI 도입하거나, 글로벌 AI 커머스 플레이어가 한국 시장 진출

### 5.3 Competitive Moat 구축 전략

PayNShip이 수동 프록시 대비 방어할 수 있는 해자:

1. **데이터 해자**: 스크래핑 데이터 축적 → 가격 예측, 배송 시간 예측 정확도 향상
2. **UX 해자**: 채팅 한 번으로 끝나는 구매 경험 vs 다단계 폼 제출
3. **비용 해자**: AI 처리로 에이전트 인건비 제거 → 낮은 수수료 가능
4. **네트워크 효과**: 상품 DB 확대 → 검색 정확도 향상 → 더 많은 유저 유입

---

## 6. Next Actions

1. **즉시**: PayPal 비즈니스 계정 개설 + 통신판매업/구매대행업 신고 절차 확인
2. **1주 내**: 주요 타겟 국가(미국, 일본, 동남아) 수출 제한 품목 리스트 정리
3. **2주 내**: 결제 플로우 설계 (PayPal Checkout → 한국 구매 → 국제배송)
4. **1개월 내**: MVP 기준 법적 리스크 체크리스트 완성 (변호사 검토 권장)
5. **분기별**: 경쟁사 모니터링 (신규 진입자, AI 도입 여부, 가격 변동)

---

## Sources

- [Zonos - South Korean Ecommerce Guide](https://zonos.com/docs/guides/country-guides/south-korea)
- [Stripe - Payments in South Korea](https://stripe.com/resources/more/payments-in-south-korea)
- [Stripe - Korean Payment Methods Docs](https://docs.stripe.com/payments/countries/korea)
- [PayPal Korea Business](https://www.paypal.com/kr/business)
- [300cbt - PayPal Business Solution Setup](https://300cbt.com/ko-intl/blogs/cross-border-payment-gateway/setting-up-paypal-business-solution-for-cross-border-payments)
- [inblog - Stripe 한국 사용 가능 여부](https://inblog.ai/ko/blog/stripe-in-korea)
- [매쉬업벤처스 - 한국 SaaS 글로벌 결제 전략](https://www.mashupventures.co/contents/global-payment-solutions-for-saas-startups)
- [BehalfKR - Digital Payment Infrastructure Barriers](https://behalfkr.com/digital-payment-infrastructure-2/)
- [Corbado - E-commerce Authentication 2026](https://www.corbado.com/blog/state-of-ecommerce-authentication)
- [Regulation Asia - Korea Bank-Like Security Rules](https://www.regulationasia.com/articles/korea-eyes-bank-like-security-rules-for-major-retail-platforms)
- [Anchanto - Korea E-commerce Guide 2026](https://anchanto.com/korea-e-commerce-industry/)
- [Trade.gov - South Korea Ecommerce](https://www.trade.gov/country-commercial-guides/south-korea-ecommerce)
- [WholeKorea - Best 17 Korea Proxy Services](https://wholekorea.com/best-17-korea-proxy-shopping-and-buying-services/)
- [KoreanBuddies](https://www.koreanbuddies.com/)
- [Harumio](https://www.harum.io/)
- [KoreaToMe](https://koreatome.com)
- [WCO - Korea Customs E-commerce](https://mag.wcoomd.org/magazine/wco-news-108-issue-3-2025/korea-customs-services-e-commerce/)
- [KORUS FTA - U.S. CBP](https://www.cbp.gov/trade/priority-issues/trade-agreements/korea)

---

*Analysis date: 2026-03-06. Competitive landscape changes rapidly — recommend quarterly refresh.*
