# PayNShip MVP 아키텍처 설계서

> **버전**: v0.3.0-draft
> **작성일**: 2025-12-06
> **상태**: Legacy (Pre-implementation Draft)
>
> 이 문서는 초기 MVP 설계 기록입니다. 현재 운영 기준 문서는 아래를 우선 참조하세요.
> - `documents/Reference/USER_JOURNEY_STORYBOARD_2026-02-19.md`
> - `documents/PRODUCT_SPECIFICATION.md`
> - `documents/Features/STATUS.md`

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [핵심 사용자 여정](#2-핵심-사용자-여정)
3. [AI/LLM 대화 시나리오](#3-aillm-대화-시나리오)
4. [시스템 아키텍처](#4-시스템-아키텍처)
5. [목업 시스템 전략](#5-목업-시스템-전략)
6. [외부 서비스 연동](#6-외부-서비스-연동)
7. [데이터 모델 설계](#7-데이터-모델-설계)
8. [구현 단계별 계획](#8-구현-단계별-계획)
9. [파일 구조](#9-파일-구조)

---

## 1. 서비스 개요

### 1.1 서비스 정의

**PayNShip**는 해외 고객이 한국 상품을 쉽게 구매할 수 있도록 도와주는 **AI 기반 쇼핑 대행 서비스**입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PayNShip 서비스                          │
├─────────────────────────────────────────────────────────────────┤
│  사용자 ──► AI 챗봇 ──► 상품 탐색/스크래핑 ──► 가격 계산        │
│                              │                                   │
│                              ▼                                   │
│              장바구니 ──► 결제(PayPal) ──► Shopify 주문 생성    │
│                              │                                   │
│                              ▼                                   │
│              한국 내 구매대행 ──► 국제배송 ──► 고객 수령        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 가치 제안

| 기존 방식 | PayNShip |
|-----------|-------------|
| 한국어 사이트 직접 탐색 | AI가 자연어로 상품 추천 |
| 복잡한 가격 계산 (환율/관세/배송) | 실시간 총 비용 자동 계산 |
| 여러 사이트 개별 구매 | 장바구니에서 일괄 관리 |
| 구매대행 업체 개별 연락 | 챗봇으로 원스톱 주문 |

### 1.3 기본 사용 형태

```
┌──────────────────────────────────────────────────────────────────┐
│                        사용자 인터랙션 모드                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [모드 1: URL 직접 입력]                                          │
│  사용자가 쿠팡/네이버 상품 URL을 붙여넣기                          │
│  → AI가 상품 정보 추출 → 가격 계산 → 구매 진행                    │
│                                                                   │
│  [모드 2: 자연어 검색/추천]                                        │
│  "BTS 앨범 추천해줘", "한국 과자 뭐가 인기야?"                     │
│  → AI가 상품 검색/추천 → 선택 → 가격 계산 → 구매 진행             │
│                                                                   │
│  [모드 3: 순차적 쇼핑 (장바구니)]                                  │
│  여러 상품을 탐색하며 장바구니에 담기                              │
│  → 모아서 한 번에 결제 → 묶음 배송으로 비용 절감                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.4 타겟 시장

- **1차 타겟**: 미국 거주 K-pop/K-beauty/K-food 팬
- **2차 타겟**: 동남아시아 한류 팬 (싱가포르, 태국, 베트남)
- **3차 타겟**: 유럽/일본 한국 상품 구매자

---

## 2. 핵심 사용자 여정

### 2.1 전체 서비스 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                          사용자 여정 맵                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          │
│  │  발견   │───►│  탐색   │───►│  담기   │───►│  결제   │          │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘          │
│       │              │              │              │                 │
│       ▼              ▼              ▼              ▼                 │
│  서비스 접속     상품 검색      장바구니 추가    결제 완료           │
│  AI 인사        URL 입력       옵션 선택        주문 확인           │
│                 추천 요청      수량 조절                             │
│                               계속 쇼핑                              │
│                                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                         │
│  │  구매   │───►│  배송   │───►│  수령   │                         │
│  └─────────┘    └─────────┘    └─────────┘                         │
│       │              │              │                                │
│       ▼              ▼              ▼                                │
│  한국 내 구매    국제 배송      최종 수령                            │
│  상품 검수      트래킹 제공    리뷰/재구매                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 단계별 상세 플로우

#### Phase A: 발견 & 온보딩
```
사용자 → 서비스 접속
        ↓
      AI: "안녕하세요! 한국 상품 쇼핑을 도와드릴게요.
           어떤 상품을 찾으시나요?"
        ↓
      [퀵 액션 버튼]
      - "K-pop 앨범 추천"
      - "한국 화장품 추천"
      - "URL 붙여넣기"
```

#### Phase B: 상품 탐색
```
[경로 1: URL 직접 입력]
사용자: "https://www.coupang.com/vp/products/..."
   ↓
AI: 스크래핑 진행 (로딩 표시)
   ↓
[ProductCard 표시]
- 상품 이미지
- 상품명
- 한국 가격 (₩29,900)
- 옵션 선택 (사이즈/색상)
   ↓
AI: "이 상품이 맞나요? 옵션을 선택해주세요."

[경로 2: 자연어 검색]
사용자: "BTS 앨범 추천해줘"
   ↓
AI: 5개 앨범 추천 (카드 형태)
   ↓
사용자: "두 번째 앨범 볼게"
   ↓
AI: 상세 정보 표시 + 구매 옵션
```

#### Phase C: 장바구니 관리
```
사용자: "장바구니에 담아줘"
   ↓
AI: "장바구니에 추가했어요!
     현재 장바구니: 1개 상품 (예상 $45)
     계속 쇼핑하시겠어요?"
   ↓
[버튼: "계속 쇼핑" / "장바구니 보기" / "결제하기"]
   ↓
사용자: "계속 쇼핑할래"
   ↓
AI: "어떤 상품을 더 찾아드릴까요?"
   ↓
(반복...)
   ↓
사용자: "장바구니 보여줘"
   ↓
[CartPanel 표시]
┌────────────────────────────────────────┐
│ 🛒 장바구니 (3개 상품)                  │
├────────────────────────────────────────┤
│ □ BTS Proof 앨범          $35.00  x1  │
│ □ 신라면 멀티팩           $12.50  x2  │
│ □ 이니스프리 그린티 세럼  $18.00  x1  │
├────────────────────────────────────────┤
│ 상품 소계:              $77.50        │
│ 예상 배송비:            $25.00        │
│ 예상 관세:               $0.00        │
│ 서비스 수수료 (10%):     $7.75        │
├────────────────────────────────────────┤
│ 예상 총액:             $110.25        │
└────────────────────────────────────────┘
[선택 삭제] [전체 비우기] [결제하기]
```

#### Phase D: 주소 입력 & 최종 견적
```
사용자: "결제할게"
   ↓
AI: "배송지 정보를 입력해주세요."
   ↓
[AddressForm 모달]
- 이름
- 주소 (Street, City, State, Zip)
- 전화번호
- 국가 선택
   ↓
사용자: 주소 입력 완료
   ↓
[Invoice 표시 - 최종 확정 견적]
┌────────────────────────────────────────┐
│ 📋 최종 견적서                          │
├────────────────────────────────────────┤
│ 상품 금액:              $77.50        │
│ 한국 내 배송비:          $2.50        │
│ 국제 배송비:            $28.00        │
│ 관세 (0%):               $0.00        │
│ 부가세 (8%):             $6.20        │
│ 서비스 수수료 (10%):     $8.00        │
├────────────────────────────────────────┤
│ 최종 결제 금액:        $122.20        │
│ 예상 배송일: 7-14일                    │
└────────────────────────────────────────┘
[PayPal로 결제하기]
```

#### Phase E: 결제 & 주문 확정
```
사용자: [PayPal 결제 버튼 클릭]
   ↓
PayPal 결제 창 (팝업/리다이렉트)
   ↓
결제 성공
   ↓
AI: "주문이 완료되었습니다! 🎉
     주문번호: KBA-2024-001234
     예상 배송일: 12/20 - 12/27

     이메일로 상세 내역을 보내드렸어요.
     배송 시작되면 트래킹 번호 알려드릴게요!"
```

#### Phase F: 이후 상태 관리
```
[Shopify 백엔드]
주문 생성 → 한국 구매대행 진행 → 상품 검수 → 국제 발송
                                           ↓
                                    트래킹 번호 발급
                                           ↓
[사용자 알림]
AI/이메일: "상품이 발송되었습니다!
           트래킹: DHL 1234567890
           예상 도착: 12/25"
```

---

## 3. AI/LLM 대화 시나리오

### 3.1 Intent 분류 체계

```
┌──────────────────────────────────────────────────────────────────┐
│                        Intent 분류 체계                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [기존 Intent]                                                    │
│  ├── product_url      : URL 입력 → 스크래핑                      │
│  ├── search           : 상품 검색/추천 요청                       │
│  ├── general_chat     : 일반 질문/서비스 안내                     │
│  └── followup         : 이전 대화 참조                            │
│                                                                   │
│  [신규 Intent - 장바구니]                                         │
│  ├── cart_add         : "장바구니에 담아줘"                       │
│  ├── cart_view        : "장바구니 보여줘"                         │
│  ├── cart_update      : "수량 변경해줘", "삭제해줘"               │
│  ├── cart_clear       : "장바구니 비워줘"                         │
│  └── cart_checkout    : "결제할게", "주문하기"                    │
│                                                                   │
│  [신규 Intent - 주문/배송]                                        │
│  ├── order_status     : "주문 상태 알려줘"                        │
│  ├── order_history    : "이전 주문 내역"                          │
│  └── shipping_track   : "배송 어디야?"                            │
│                                                                   │
│  [신규 Intent - 계속 쇼핑]                                        │
│  ├── continue_shopping: "계속 쇼핑할래", "다른 거 더 볼게"        │
│  └── product_select   : "첫 번째꺼", "두 번째 상품"               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 멀티턴 대화 시나리오

#### 시나리오 1: 기본 쇼핑 플로우

```
[턴 1]
User: "BTS 앨범 추천해줘"
AI Intent: search_recommendation
AI Response:
  "BTS 앨범 추천드릴게요! 🎵

   1. **Proof (Anthology)** - ₩45,000 (~$32)
      방탄소년단 데뷔 9주년 기념 앨범

   2. **LOVE YOURSELF 結 'Answer'** - ₩28,000 (~$20)
      빌보드 200 1위 앨범

   3. **MAP OF THE SOUL : 7** - ₩32,000 (~$23)
      2020년 발매, 글로벌 히트작

   4. **BE (Deluxe Edition)** - ₩55,000 (~$39)
      멤버들이 직접 제작에 참여

   5. **Butter / Permission to Dance** - ₩18,000 (~$13)
      싱글 CD

   어떤 앨범이 마음에 드세요?"

[턴 2]
User: "첫 번째 앨범 자세히 보여줘"
AI Intent: product_select
AI Response:
  [ProductCard - Proof 앨범 표시]
  "BTS Proof 앨범이에요!

   📀 **BTS Proof (Anthology Album)**
   - 가격: ₩45,000 (~$32)
   - 버전: Standard / Compact / Collector's
   - 구성: CD 3장 + 포토북 + 포토카드

   버전을 선택해주세요!"

[턴 3]
User: "Standard 버전으로 장바구니에 담아줘"
AI Intent: cart_add
AI Response:
  "장바구니에 추가했어요! ✅

   🛒 장바구니: 1개 상품
   - BTS Proof (Standard) - $32

   계속 쇼핑하시겠어요, 아니면 결제로 넘어갈까요?"
   [버튼: 계속 쇼핑 | 장바구니 보기 | 결제하기]

[턴 4]
User: "계속 쇼핑할래. 한국 과자도 찾아줘"
AI Intent: continue_shopping + search_recommendation
AI Response:
  "한국 과자 추천드릴게요! 🍪

   1. **오리온 초코파이** - ₩8,900 (~$6.40)
      12개입, 한국 국민 간식

   2. **농심 새우깡** - ₩2,500 (~$1.80)
      바삭한 새우맛 스낵

   3. **빙그레 바나나맛 우유 과자** - ₩3,500 (~$2.50)
      인기 음료의 과자 버전

   4. **롯데 빼빼로** - ₩1,500 (~$1.10)
      초코 스틱 과자

   5. **해태 허니버터칩** - ₩2,800 (~$2.00)
      달콤짭짤한 감자칩

   어떤 게 좋으세요?"

[턴 5]
User: "초코파이 2개랑 새우깡 3개 담아줘"
AI Intent: cart_add (복수 상품)
AI Response:
  "장바구니에 추가했어요! ✅

   🛒 장바구니 업데이트:
   - BTS Proof (Standard) x1 - $32.00
   - 오리온 초코파이 x2 - $12.80
   - 농심 새우깡 x3 - $5.40

   총 3종 6개 상품, 예상 금액: $50.20
   (배송비/관세 별도)

   더 쇼핑하시겠어요?"

[턴 6]
User: "장바구니 보여줘"
AI Intent: cart_view
AI Response:
  [CartPanel 컴포넌트 렌더링]
  "현재 장바구니예요! 👆

   배송지에 따라 정확한 비용이 계산돼요.
   결제 준비 되셨으면 '결제하기' 눌러주세요!"

[턴 7]
User: "결제할게"
AI Intent: cart_checkout
AI Response:
  "배송지 정보가 필요해요! 📍"
  [AddressForm 모달 표시]

[턴 8]
User: [주소 폼 제출]
System: 주소 정보 수신
AI Response:
  [Invoice 컴포넌트 렌더링]
  "최종 견적이에요!
   미국 뉴욕으로 배송 시:

   - 상품: $50.20
   - 국제배송: $18.00
   - 관세: $0 (면세 기준 이하)
   - 세금: $4.02
   - 수수료: $5.02
   ──────────────
   총액: $77.24

   PayPal로 결제하시겠어요?"

[턴 9]
User: [PayPal 결제 완료]
System: 결제 성공 콜백
AI Response:
  "주문 완료! 🎉

   주문번호: KBA-2024-001234
   결제금액: $77.24
   예상 배송: 12월 20일 ~ 27일

   주문 확인 이메일을 보내드렸어요.
   배송 시작되면 알려드릴게요!

   또 필요하신 게 있으시면 말씀해주세요 😊"
```

#### 시나리오 2: 장바구니 수정

```
[턴 1]
User: "장바구니에서 새우깡 1개만 빼줘"
AI Intent: cart_update
AI Response:
  "새우깡 수량을 2개로 변경했어요! ✅

   🛒 장바구니:
   - BTS Proof (Standard) x1 - $32.00
   - 오리온 초코파이 x2 - $12.80
   - 농심 새우깡 x2 - $3.60 (변경됨)

   총 예상: $48.40"

[턴 2]
User: "초코파이는 삭제해줘"
AI Intent: cart_update (삭제)
AI Response:
  "초코파이를 삭제했어요! 🗑️

   🛒 장바구니:
   - BTS Proof (Standard) x1 - $32.00
   - 농심 새우깡 x2 - $3.60

   총 예상: $35.60"
```

#### 시나리오 3: URL 직접 입력 + 장바구니

```
[턴 1]
User: "https://www.coupang.com/vp/products/302345678"
AI Intent: product_url
AI Response:
  "상품 정보를 가져오고 있어요... ⏳"
  [3초 후]
  [ProductCard 표시]
  "이 상품이에요!

   **이니스프리 그린티 씨드 세럼**
   - 가격: ₩28,000 (~$20)
   - 용량: 80ml

   장바구니에 담으시겠어요?"

[턴 2]
User: "응 담아줘"
AI Intent: cart_add (컨텍스트에서 현재 상품 참조)
AI Response:
  "장바구니에 추가했어요! ✅

   🛒 장바구니: 1개 상품
   - 이니스프리 그린티 씨드 세럼 - $20

   계속 쇼핑하시겠어요?"
```

#### 시나리오 4: 주문 상태 확인

```
[턴 1]
User: "내 주문 어디까지 왔어?"
AI Intent: order_status
AI Response:
  "가장 최근 주문 상태예요! 📦

   주문번호: KBA-2024-001234
   상태: **배송 중** 🚚

   - 12/10 주문 완료
   - 12/12 한국 내 상품 수령
   - 12/13 검수 완료
   - 12/14 국제 발송 ← 현재

   트래킹: DHL 1234567890
   예상 도착: 12/20

   [DHL 트래킹 페이지 열기]"
```

### 3.3 에러 핸들링 시나리오

```
[스크래핑 실패]
User: "https://www.11st.co.kr/products/123456"
AI: "죄송해요, 현재 11번가는 지원하지 않아요. 😅
     쿠팡이나 네이버 쇼핑 링크를 붙여넣어 주시겠어요?

     또는 찾으시는 상품을 말씀해주시면 제가 대신 찾아볼게요!"

[빈 장바구니 결제 시도]
User: "결제할게"
AI: "장바구니가 비어있어요! 🛒
     먼저 상품을 담아주세요.

     어떤 상품을 찾아드릴까요?"

[재고 부족]
User: "BTS 앨범 10개 담아줘"
AI: "죄송해요, 해당 상품은 최대 5개까지만 주문 가능해요.
     5개로 변경해서 담을까요?"
```

---

## 4. 시스템 아키텍처

### 4.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            PayNShip 시스템 아키텍처                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   사용자 (브라우저)│                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Frontend (Next.js React)                      │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │  │
│  │  │ChatInterface│ │ ProductCard │ │  CartPanel  │ │  Invoice   │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        API Layer (Next.js)                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │/api/agent│ │/api/cart │ │/api/quote│ │/api/order│            │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Agent Orchestrator                           │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                   Intent Classifier (Gemini)                 │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │           │                                                       │  │
│  │           ▼                                                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │ Product │ │ Search  │ │  Cart   │ │ Checkout│ │  Chat   │   │  │
│  │  │  Agent  │ │  Agent  │ │  Agent  │ │  Agent  │ │  Agent  │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Core Services                               │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │  │
│  │  │ Scraper   │ │Calculator │ │  Cart     │ │  Session  │        │  │
│  │  │ Service   │ │ Service   │ │  Service  │ │  Service  │        │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Data Layer                                 │  │
│  │  ┌───────────────────────┐  ┌───────────────────────┐           │  │
│  │  │    Prisma ORM         │  │    Mock Data Store    │           │  │
│  │  │    (SQLite/Postgres)  │  │    (개발 환경)         │           │  │
│  │  └───────────────────────┘  └───────────────────────┘           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     External Services                             │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │ Shopify │ │ PayPal  │ │ Alipay  │ │ Gemini  │ │ Exchange│   │  │
│  │  │  API    │ │   API   │ │   API   │ │   API   │ │ Rate API│   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Agent 시스템 상세 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Agent Orchestration Flow                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  사용자 메시지                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Intent Classifier                             │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Regex 패턴 매칭 (URL 감지) - 최우선                      │  │   │
│  │  │ 2. 키워드 매칭 (장바구니, 결제 등) - 빠른 분류              │  │   │
│  │  │ 3. Gemini LLM 분류 - 복잡한 케이스                         │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Context Manager                               │   │
│  │  - 현재 세션 상태 로드                                           │   │
│  │  - 이전 대화 히스토리 (최근 10개)                                │   │
│  │  - 현재 장바구니 상태                                            │   │
│  │  - 마지막 조회 상품 정보                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Agent Router                                  │   │
│  │                                                                   │   │
│  │  Intent Type          →    Agent Handler                         │   │
│  │  ─────────────────────────────────────────────                   │   │
│  │  product_url          →    ProductAgent.scrapeAndDisplay()       │   │
│  │  search               →    SearchAgent.recommendProducts()       │   │
│  │  product_select       →    ProductAgent.showDetail()             │   │
│  │  cart_add             →    CartAgent.addItem()                   │   │
│  │  cart_view            →    CartAgent.showCart()                  │   │
│  │  cart_update          →    CartAgent.updateItem()                │   │
│  │  cart_checkout        →    CheckoutAgent.initCheckout()          │   │
│  │  order_status         →    OrderAgent.getStatus()                │   │
│  │  general_chat         →    ChatAgent.respond()                   │   │
│  │  continue_shopping    →    ChatAgent.promptNextAction()          │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Response Builder                              │   │
│  │  - AI 텍스트 응답 생성                                           │   │
│  │  - UI 컴포넌트 지정 (ProductCard, CartPanel, Invoice 등)        │   │
│  │  - 다음 액션 힌트 (nextAction)                                   │   │
│  │  - 컨텍스트 업데이트                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Flow Diagram                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [스크래핑 플로우]                                                        │
│  URL 입력 → Scraper → (Mock/Real) → Product 저장 → ProductCard 표시     │
│                                                                          │
│  [장바구니 플로우]                                                        │
│  "담아줘" → CartAgent → CartService.add() → DB 저장 → CartPanel 업데이트 │
│                                                                          │
│  [견적 플로우]                                                            │
│  주소 입력 → Calculator → (Mock/Real) → Quote 저장 → Invoice 표시        │
│                                                                          │
│  [결제 플로우]                                                            │
│  PayPal 클릭 → PayPal API → 결제 성공 → Shopify Order 생성 → 완료 표시   │
│                                                                          │
│  [상태 동기화]                                                            │
│  Shopify Webhook → Order 상태 업데이트 → 사용자 알림                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 목업 시스템 전략

### 5.1 환경 변수 기반 전환

```typescript
// .env.local
USE_MOCK_SCRAPER=true      // 스크래핑 목업 활성화
USE_MOCK_CALCULATOR=true   // 가격 계산 목업 활성화
USE_MOCK_PAYMENT=true      // 결제 목업 활성화
USE_MOCK_SHOPIFY=true      // Shopify 연동 목업 활성화

// 프로덕션
USE_MOCK_SCRAPER=false
USE_MOCK_CALCULATOR=false
USE_MOCK_PAYMENT=false
USE_MOCK_SHOPIFY=false
```

### 5.2 스크래핑 목업 전략

```typescript
// lib/scraper/index.ts
export async function scrapeProduct(url: string): Promise<Product> {
  // 환경변수 체크 - 목업 모드
  if (process.env.USE_MOCK_SCRAPER === 'true') {
    return getMockProduct(url);
  }

  // 실제 스크래핑 로직
  return realScrapeProduct(url);
}

// lib/scraper/mocks/index.ts
export function getMockProduct(url: string): Product {
  const domain = extractDomain(url);
  const category = detectCategoryFromUrl(url);

  // 도메인/카테고리별 목업 데이터 반환
  return mockProductData[domain]?.[category] ?? defaultMockProduct;
}
```

### 5.3 목업 데이터 구조

```
lib/scraper/mocks/
├── index.ts              # 목업 라우터
├── products/
│   ├── kpop.ts          # K-pop 앨범/굿즈 샘플
│   ├── beauty.ts        # 화장품 샘플
│   ├── food.ts          # 식품 샘플
│   ├── fashion.ts       # 패션 샘플
│   └── electronics.ts   # 전자기기 샘플
└── search-results/
    ├── kpop.ts          # K-pop 검색 결과
    ├── beauty.ts        # 화장품 검색 결과
    └── food.ts          # 식품 검색 결과
```

```typescript
// lib/scraper/mocks/products/kpop.ts
export const kpopMockProducts: MockProduct[] = [
  {
    id: 'mock-bts-proof',
    name: 'BTS - Proof (Anthology Album)',
    imageUrl: '/mock-images/bts-proof.jpg',
    priceKrw: 45000,
    category: 'K-pop',
    weightKg: 0.8,
    domesticShipping: 3000,
    sourceUrl: 'https://www.coupang.com/mock/bts-proof',
    options: [
      {
        name: 'Version',
        type: 'select',
        required: true,
        values: [
          { label: 'Standard', value: 'standard', priceAdjustment: 0 },
          { label: 'Compact', value: 'compact', priceAdjustment: -10000 },
          { label: "Collector's", value: 'collectors', priceAdjustment: 25000 },
        ]
      }
    ],
    hsCode: '8523.49', // 음반
  },
  // ... 더 많은 샘플
];
```

### 5.4 가격 계산 목업 전략

```typescript
// lib/calculator/price.ts
export async function calculatePrice(params: PriceParams): Promise<PriceBreakdown> {
  if (process.env.USE_MOCK_CALCULATOR === 'true') {
    return getMockPriceBreakdown(params);
  }

  return realCalculatePrice(params);
}

// lib/calculator/mocks.ts
export function getMockPriceBreakdown(params: PriceParams): PriceBreakdown {
  const exchangeRate = 1400; // 고정 환율
  const itemPriceUSD = params.priceKrw / exchangeRate;

  // 간소화된 배송비 (3개 지역 그룹)
  const shippingCost = getMockShipping(params.countryCode, params.weightKg);

  // 간소화된 관세 (5개 카테고리)
  const { duty, tax } = getMockDutyAndTax(params.category, itemPriceUSD, params.countryCode);

  const subtotal = itemPriceUSD + shippingCost;
  const serviceFee = subtotal * 0.10;

  return {
    itemPriceKRW: params.priceKrw,
    itemPriceUSD,
    exchangeRate,
    shippingCost,
    customsDuty: duty,
    salesTax: tax,
    serviceFee,
    totalUSD: subtotal + duty + tax + serviceFee,
    estimatedDays: getEstimatedDays(params.countryCode),
  };
}

// 3개 지역 그룹 배송비
function getMockShipping(countryCode: string, weightKg: number): number {
  const regions = {
    asia: ['JP', 'SG', 'TH', 'VN', 'CN', 'TW', 'HK'],    // 아시아
    americas: ['US', 'CA', 'MX', 'BR'],                   // 아메리카
    europe: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL'],        // 유럽
  };

  const rates = {
    asia: { base: 10, perKg: 8 },
    americas: { base: 15, perKg: 12 },
    europe: { base: 18, perKg: 15 },
  };

  const region = Object.entries(regions).find(([_, countries]) =>
    countries.includes(countryCode)
  )?.[0] ?? 'americas';

  const rate = rates[region];
  return Math.max(rate.base, weightKg * rate.perKg);
}

// 5개 카테고리 관세
function getMockDutyAndTax(category: string, priceUSD: number, countryCode: string) {
  const dutyRates = {
    'fashion': 0.12,      // 의류/패션
    'electronics': 0,     // 전자기기 (면세)
    'cosmetics': 0,       // 화장품 (면세)
    'food': 0.05,         // 식품
    'other': 0.05,        // 기타
  };

  const taxRates = {
    'US': 0.08,
    'GB': 0.20,
    'CA': 0.13,
    'DE': 0.19,
    'JP': 0.10,
    'SG': 0.09,
  };

  const dutyRate = dutyRates[category] ?? dutyRates['other'];
  const taxRate = taxRates[countryCode] ?? 0.10;

  // 미국 $800 이하 면세
  if (countryCode === 'US' && priceUSD < 800) {
    return { duty: 0, tax: priceUSD * taxRate };
  }

  const duty = priceUSD * dutyRate;
  const taxableAmount = priceUSD + duty;
  const tax = taxableAmount * taxRate;

  return { duty, tax };
}
```

### 5.5 결제/Shopify 목업

```typescript
// lib/payment/mock.ts
export async function mockPayPalCheckout(orderId: string): Promise<PaymentResult> {
  // 2초 딜레이로 결제 시뮬레이션
  await delay(2000);

  return {
    success: true,
    transactionId: `MOCK-PP-${Date.now()}`,
    status: 'COMPLETED',
  };
}

// lib/shopify/mock.ts
export async function mockCreateShopifyOrder(cart: Cart, payment: PaymentResult): Promise<Order> {
  await delay(1000);

  return {
    id: `MOCK-ORDER-${Date.now()}`,
    orderNumber: `KBA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
    status: 'PENDING',
    items: cart.items,
    totalUSD: cart.totalUSD,
    createdAt: new Date(),
  };
}
```

---

## 6. 외부 서비스 연동

### 6.1 연동 서비스 매핑

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      External Service Integration Map                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │   PayNShip   │                                                    │
│  │   (우리 서비스)  │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                              │
│    ┌──────┴──────┬──────────────┬──────────────┬──────────────┐        │
│    │             │              │              │              │        │
│    ▼             ▼              ▼              ▼              ▼        │
│ ┌──────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐   │
│ │Gemini│   │ Shopify  │   │ PayPal  │   │ Alipay  │   │Exchange  │   │
│ │ API  │   │   API    │   │   API   │   │   API   │   │Rate API  │   │
│ └──────┘   └──────────┘   └─────────┘   └─────────┘   └──────────┘   │
│    │             │              │              │              │        │
│    │             │              │              │              │        │
│ AI/LLM      상품/주문/       미국 고객      중국 고객       환율        │
│ 처리        배송 관리        결제           결제           변환        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Shopify 연동 상세

**Shopify에서 활용할 기능:**

| 기능 | Shopify API | 우리 서비스에서 활용 |
|------|-------------|---------------------|
| **상품 관리** | Products API | 스크래핑된 상품을 Shopify에 동기화 |
| **장바구니** | Storefront Cart API | 장바구니 상태 저장 (선택적) |
| **주문 생성** | Orders API / Draft Orders | 결제 완료 후 주문 생성 |
| **재고 관리** | Inventory API | 재고 상태 확인 (Phase 2) |
| **결제 연동** | Checkout API | PayPal/Alipay 결제 처리 |
| **배송 관리** | Fulfillment API | 배송 상태 업데이트, 트래킹 |
| **웹훅** | Webhooks | 주문 상태 변경 알림 |
| **고객 관리** | Customer API | 사용자 계정 연동 |

**Shopify 연동 아키텍처:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Shopify Integration Architecture                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [PayNShip]                              [Shopify Store]             │
│                                                                          │
│  사용자 장바구니 ─────────────────────────► Shopify Cart (선택적)       │
│       │                                           │                      │
│       ▼                                           │                      │
│  결제 요청 ──────► PayPal/Alipay ────────────────┤                      │
│       │              │                            │                      │
│       │              ▼                            │                      │
│       │         결제 완료                         │                      │
│       │              │                            │                      │
│       ▼              ▼                            ▼                      │
│  주문 생성 ◄─── 결제 정보 ─────────────────► Shopify Order 생성        │
│       │                                           │                      │
│       ▼                                           │                      │
│  주문 확인 표시                                   │                      │
│       │                                           │                      │
│       │◄──────────── Webhook ◄───────────────────┤                      │
│       │         (주문 상태 변경)                   │                      │
│       ▼                                           ▼                      │
│  상태 업데이트 ◄────────────────────────── Fulfillment 업데이트        │
│  (배송 트래킹)                                (트래킹 번호 입력)         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Shopify 어댑터 설계:**

```typescript
// lib/shopify/adapter.ts
interface ShopifyAdapter {
  // 상품 동기화
  syncProduct(product: ScrapedProduct): Promise<ShopifyProduct>;

  // 주문 생성
  createOrder(cart: Cart, payment: PaymentResult, address: Address): Promise<ShopifyOrder>;

  // 주문 상태 조회
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  // 배송 정보 업데이트
  updateFulfillment(orderId: string, tracking: TrackingInfo): Promise<void>;

  // 웹훅 처리
  handleWebhook(event: ShopifyWebhookEvent): Promise<void>;
}
```

### 6.3 PayPal 연동 상세

**PayPal에서 활용할 기능:**

| 기능 | PayPal API | 용도 |
|------|------------|------|
| **주문 생성** | Orders API v2 | 결제 주문 생성 |
| **결제 승인** | Orders API - Authorize | 결제 승인 (홀드) |
| **결제 캡처** | Orders API - Capture | 실제 결제 처리 |
| **환불** | Payments API - Refund | 환불 처리 |
| **결제 버튼** | JS SDK | 프론트엔드 결제 UI |

**PayPal 결제 플로우:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PayPal Payment Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 클라이언트: 결제 버튼 클릭                                           │
│       │                                                                  │
│       ▼                                                                  │
│  2. 서버: POST /api/payment/create                                      │
│       │   → PayPal Orders API: Create Order                             │
│       │   → 응답: order_id, approval_url                                │
│       ▼                                                                  │
│  3. 클라이언트: PayPal 결제 팝업 표시                                    │
│       │   (사용자가 PayPal 계정으로 로그인 & 승인)                       │
│       ▼                                                                  │
│  4. PayPal → 클라이언트: 결제 승인 완료                                  │
│       │                                                                  │
│       ▼                                                                  │
│  5. 클라이언트 → 서버: POST /api/payment/capture                        │
│       │   → PayPal Orders API: Capture Order                            │
│       │   → 결제 완료                                                    │
│       ▼                                                                  │
│  6. 서버: Shopify 주문 생성 + DB 업데이트                               │
│       │                                                                  │
│       ▼                                                                  │
│  7. 클라이언트: 주문 완료 화면 표시                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**PayPal 어댑터 설계:**

```typescript
// lib/payment/paypal/adapter.ts
interface PayPalAdapter {
  // 주문 생성
  createOrder(amount: number, currency: string, items: CartItem[]): Promise<{
    orderId: string;
    approvalUrl: string;
  }>;

  // 결제 캡처
  captureOrder(orderId: string): Promise<{
    transactionId: string;
    status: 'COMPLETED' | 'FAILED';
    capturedAmount: number;
  }>;

  // 환불
  refundCapture(captureId: string, amount?: number): Promise<{
    refundId: string;
    status: string;
  }>;
}
```

### 6.4 Alipay 연동 상세 (Phase 2+)

**Alipay에서 활용할 기능:**

| 기능 | Alipay API | 용도 |
|------|------------|------|
| **Cross-border Payment** | Antom Web Payment | 중국 고객 결제 |
| **환율 변환** | Built-in | CNY → USD 자동 변환 |
| **QR 코드 결제** | QR Code API | 모바일 결제 |

**Alipay 어댑터 설계:**

```typescript
// lib/payment/alipay/adapter.ts
interface AlipayAdapter {
  // 결제 페이지 URL 생성
  createPayment(amount: number, orderId: string): Promise<{
    paymentUrl: string;
    tradeNo: string;
  }>;

  // 결제 상태 확인
  queryPayment(tradeNo: string): Promise<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    paidAmount: number;
  }>;

  // 환불
  refund(tradeNo: string, amount: number): Promise<{
    refundNo: string;
    status: string;
  }>;
}
```

### 6.5 서비스 어댑터 패턴

```typescript
// lib/adapters/types.ts
interface PaymentAdapter {
  createPayment(params: PaymentParams): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount?: number): Promise<RefundResult>;
}

interface ECommerceAdapter {
  createOrder(cart: Cart, payment: PaymentResult): Promise<Order>;
  getOrder(orderId: string): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
}

// lib/adapters/payment/index.ts
export function getPaymentAdapter(method: 'paypal' | 'alipay'): PaymentAdapter {
  if (process.env.USE_MOCK_PAYMENT === 'true') {
    return new MockPaymentAdapter();
  }

  switch (method) {
    case 'paypal':
      return new PayPalAdapter();
    case 'alipay':
      return new AlipayAdapter();
  }
}

// lib/adapters/ecommerce/index.ts
export function getECommerceAdapter(): ECommerceAdapter {
  if (process.env.USE_MOCK_SHOPIFY === 'true') {
    return new MockShopifyAdapter();
  }

  return new ShopifyAdapter();
}
```

---

## 7. 데이터 모델 설계

### 7.1 확장된 Prisma 스키마

```prisma
// prisma/schema.prisma

// 기존 모델들...

// 신규: 장바구니
model Cart {
  id          String     @id @default(uuid())
  sessionId   String     @unique  // ChatSession과 연결
  items       CartItem[]

  // 계산된 값 (캐시)
  subtotalKrw Int?
  subtotalUsd Float?

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  session     ChatSession @relation(fields: [sessionId], references: [id])
}

model CartItem {
  id          String   @id @default(uuid())
  cartId      String
  productId   String?  // 스크래핑된 상품 (있는 경우)

  // 상품 정보 스냅샷 (스크래핑 없이도 동작)
  name        String
  imageUrl    String?
  priceKrw    Int
  sourceUrl   String
  category    String   @default("other")
  weightKg    Float    @default(0.5)
  hsCode      String   @default("9999.99")

  // 선택 옵션
  selectedOptions Json?  // { "size": "M", "color": "Black" }
  optionPriceAdjustment Int @default(0)

  quantity    Int      @default(1)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cart        Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product     Product? @relation(fields: [productId], references: [id])
}

// ChatSession 확장
model ChatSession {
  id          String   @id @default(uuid())
  userId      String?
  messages    Json     // 대화 히스토리
  currentStep String   @default("initial")
  context     Json?    // 확장된 컨텍스트

  // 현재 상태 참조
  lastViewedProductId String?  // 마지막으로 본 상품
  lastSearchResults   Json?    // 마지막 검색 결과 (5개 상품)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User?    @relation(fields: [userId], references: [id])
  cart        Cart?    // 1:1 관계
}

// 주문 확장
model Order {
  id              String   @id @default(uuid())
  quoteId         String?
  shopifyOrderId  String?  @unique

  // 결제 정보
  paymentMethod   String   // 'paypal' | 'alipay'
  paymentTransactionId String?

  // 주문 상태
  status          OrderStatus @default(PENDING)

  // 배송 정보
  shippingAddress Json
  trackingNumber  String?
  trackingUrl     String?

  // 금액
  subtotalUsd     Float
  shippingUsd     Float
  dutyUsd         Float
  taxUsd          Float
  serviceFeeUsd   Float
  totalUsd        Float

  // 타임스탬프
  paidAt          DateTime?
  shippedAt       DateTime?
  deliveredAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  quote           Quote?   @relation(fields: [quoteId], references: [id])
  items           OrderItem[]
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String

  name        String
  imageUrl    String?
  priceUsd    Float
  quantity    Int
  options     Json?

  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

enum OrderStatus {
  PENDING           // 주문 생성됨
  PAID              // 결제 완료
  PURCHASING        // 한국 내 구매 진행 중
  PURCHASED         // 한국 내 구매 완료
  INSPECTING        // 상품 검수 중
  SHIPPING          // 국제 배송 중
  DELIVERED         // 배송 완료
  CANCELLED         // 취소됨
  REFUNDED          // 환불됨
}
```

### 7.2 확장된 ChatContext 타입

```typescript
// types/index.ts

interface ChatContext {
  // 기본 상태
  step: ChatStep;

  // 상품 관련
  scrapeRequestId?: string;
  productId?: string;
  lastViewedProduct?: ProductSummary;  // 마지막으로 본 상품 요약

  // 검색/추천 관련
  lastSearchQuery?: string;
  lastSearchResults?: ProductSummary[];  // 최근 검색 결과 (5개)

  // 장바구니 관련
  cartId?: string;
  cartItemCount?: number;

  // 견적/결제 관련
  quoteId?: string;
  selectedAddress?: Address;

  // 주문 관련
  orderId?: string;
  orderNumber?: string;
}

interface ProductSummary {
  id?: string;
  name: string;
  imageUrl?: string;
  priceKrw: number;
  priceUsd: number;
  sourceUrl: string;
  category?: string;
}

type ChatStep =
  | 'initial'
  | 'browsing'           // 상품 탐색 중
  | 'product_viewing'    // 상품 상세 보기
  | 'option_selecting'   // 옵션 선택 중
  | 'cart_managing'      // 장바구니 관리
  | 'address_input'      // 주소 입력
  | 'quote_review'       // 견적 확인
  | 'payment_pending'    // 결제 대기
  | 'order_confirmed'    // 주문 완료
  | 'error';
```

---

## 8. 구현 단계별 계획

### 8.1 Phase 0: 목업 시스템 구축 (현재)

**목표:** 외부 의존성 없이 전체 플로우 동작

| 작업 | 파일 | 설명 |
|------|------|------|
| 목업 환경변수 설정 | `.env.local` | USE_MOCK_* 변수 추가 |
| 스크래핑 목업 | `lib/scraper/mocks/*` | 카테고리별 샘플 데이터 |
| 가격계산 목업 | `lib/calculator/mocks.ts` | 고정환율 + 간소화 계산 |
| 결제 목업 | `lib/payment/mock.ts` | 가짜 결제 성공 응답 |
| Shopify 목업 | `lib/shopify/mock.ts` | 가짜 주문 생성 |

### 8.2 Phase 1: 장바구니 기능

**목표:** 여러 상품을 담고 관리하는 기능

| 작업 | 파일 | 설명 |
|------|------|------|
| DB 스키마 추가 | `prisma/schema.prisma` | Cart, CartItem 모델 |
| Cart 서비스 | `lib/cart/service.ts` | CRUD 로직 |
| Cart API | `app/api/cart/route.ts` | REST 엔드포인트 |
| Cart Agent | `lib/agent/cart.ts` | Intent 처리 |
| CartPanel UI | `components/cart/CartPanel.tsx` | 장바구니 UI |
| Intent 확장 | `lib/agent/orchestrator.ts` | cart_* Intent 추가 |

### 8.3 Phase 2: 멀티턴 대화

**목표:** 자연스러운 순차적 쇼핑 대화

| 작업 | 파일 | 설명 |
|------|------|------|
| Context 확장 | `types/index.ts` | 확장된 ChatContext |
| 검색결과 저장 | `lib/agent/search.ts` | 결과 컨텍스트 저장 |
| 상품 선택 처리 | `lib/agent/product.ts` | "첫 번째꺼" 해석 |
| 대화 히스토리 | `lib/session/service.ts` | 컨텍스트 관리 |
| 연속 쇼핑 | `lib/agent/chat.ts` | continue_shopping 처리 |

### 8.4 Phase 3: UI 컴포넌트

**목표:** 완성된 사용자 경험

| 작업 | 파일 | 설명 |
|------|------|------|
| CartPanel 개선 | `components/cart/CartPanel.tsx` | 수량 조절, 삭제 |
| Invoice 개선 | `components/order/Invoice.tsx` | 여러 상품 지원 |
| 결제 버튼 | `components/payment/PaymentButton.tsx` | PayPal 버튼 |
| 주문 상태 | `components/order/OrderStatus.tsx` | 상태 표시 |
| 토스트 알림 | `components/ui/Toast.tsx` | 피드백 알림 |

### 8.5 Phase 4: 실제 연동 (이후)

**1차 백엔드 구현:**
- [ ] 실제 스크래핑 안정화 (Coupang/Naver)
- [ ] 실제 환율 API 연동
- [ ] 관세/배송비 정밀 계산

**2차 백엔드 구현:**
- [ ] PayPal 실제 연동
- [ ] Shopify 실제 연동
- [ ] Alipay 연동 (중국 시장)
- [ ] Webhook 처리
- [ ] 이메일 알림

---

## 9. 파일 구조

### 9.1 최종 목표 디렉토리 구조

```
paynship/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   └── route.ts              # 통합 Agent 엔드포인트
│   │   ├── cart/
│   │   │   ├── route.ts              # GET/POST (조회/추가)
│   │   │   └── [itemId]/route.ts     # PUT/DELETE (수정/삭제)
│   │   ├── quote/
│   │   │   └── route.ts              # 견적 계산
│   │   ├── payment/
│   │   │   ├── create/route.ts       # 결제 세션 생성
│   │   │   ├── capture/route.ts      # 결제 캡처
│   │   │   └── webhook/route.ts      # 결제 웹훅
│   │   ├── order/
│   │   │   ├── route.ts              # 주문 생성/조회
│   │   │   └── [orderId]/route.ts    # 주문 상세
│   │   └── scrape/
│   │       └── route.ts              # 스크래핑
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx         # 메인 컨테이너
│   │   ├── ChatContainer.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── InputArea.tsx
│   │   └── QuickActions.tsx          # 퀵 액션 버튼
│   ├── product/
│   │   ├── ProductCard.tsx           # 단일 상품 카드
│   │   ├── ProductList.tsx           # 검색 결과 리스트
│   │   └── OptionSelector.tsx        # 옵션 선택기
│   ├── cart/
│   │   ├── CartPanel.tsx             # 장바구니 패널
│   │   ├── CartItem.tsx              # 장바구니 아이템
│   │   └── CartSummary.tsx           # 합계 표시
│   ├── order/
│   │   ├── AddressForm.tsx
│   │   ├── Invoice.tsx
│   │   └── OrderStatus.tsx           # 주문 상태 표시
│   ├── payment/
│   │   └── PaymentButton.tsx         # 결제 버튼
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       └── Loading.tsx
│
├── lib/
│   ├── agent/
│   │   ├── orchestrator.ts           # 메인 오케스트레이터
│   │   ├── intent-classifier.ts      # Intent 분류
│   │   ├── types.ts                  # Agent 타입
│   │   └── handlers/
│   │       ├── product.ts            # 상품 Agent
│   │       ├── search.ts             # 검색 Agent
│   │       ├── cart.ts               # 장바구니 Agent
│   │       ├── checkout.ts           # 결제 Agent
│   │       ├── order.ts              # 주문 Agent
│   │       └── chat.ts               # 일반 대화 Agent
│   │
│   ├── scraper/
│   │   ├── index.ts                  # 라우터
│   │   ├── coupang.ts
│   │   ├── naver.ts
│   │   └── mocks/
│   │       ├── index.ts              # 목업 라우터
│   │       └── products/
│   │           ├── kpop.ts
│   │           ├── beauty.ts
│   │           └── food.ts
│   │
│   ├── calculator/
│   │   ├── price.ts                  # 메인 계산기
│   │   ├── exchange-rate.ts
│   │   ├── shipping.ts
│   │   ├── customs.ts
│   │   └── mocks.ts                  # 목업 계산
│   │
│   ├── cart/
│   │   └── service.ts                # 장바구니 서비스
│   │
│   ├── session/
│   │   └── service.ts                # 세션 관리
│   │
│   ├── adapters/
│   │   ├── types.ts                  # 어댑터 인터페이스
│   │   ├── payment/
│   │   │   ├── index.ts              # 어댑터 팩토리
│   │   │   ├── paypal.ts
│   │   │   ├── alipay.ts
│   │   │   └── mock.ts
│   │   └── ecommerce/
│   │       ├── index.ts
│   │       ├── shopify.ts
│   │       └── mock.ts
│   │
│   ├── gemini/
│   │   └── client.ts
│   │
│   └── db/
│       └── prisma.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── types/
│   └── index.ts
│
├── docs/
│   ├── MVP_ARCHITECTURE.md           # 이 문서
│   └── API_REFERENCE.md
│
├── .env.local
├── .env.example
└── package.json
```

### 9.2 환경 변수 예시

```bash
# .env.example

# 목업 모드 (개발용)
USE_MOCK_SCRAPER=true
USE_MOCK_CALCULATOR=true
USE_MOCK_PAYMENT=true
USE_MOCK_SHOPIFY=true

# AI
GEMINI_API_KEY=your-gemini-key

# 데이터베이스
DATABASE_URL=file:./dev.db

# Shopify (프로덕션)
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STOREFRONT_TOKEN=xxxxx

# PayPal (프로덕션)
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox  # sandbox | live

# Alipay (프로덕션, Phase 2+)
ALIPAY_APP_ID=xxxxx
ALIPAY_PRIVATE_KEY=xxxxx
ALIPAY_PUBLIC_KEY=xxxxx

# 환율 API (프로덕션)
EXCHANGE_RATE_API_KEY=xxxxx

# 앱 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 부록: 구현 체크리스트

### Phase 0: 목업 시스템
- [ ] 환경변수 설정 (.env.local)
- [ ] 스크래핑 목업 데이터 (K-pop, Beauty, Food)
- [ ] 가격계산 목업 (고정환율 1400)
- [ ] 결제 목업 (MockPaymentAdapter)
- [ ] Shopify 목업 (MockShopifyAdapter)

### Phase 1: 장바구니
- [ ] Prisma 스키마 (Cart, CartItem)
- [ ] DB 마이그레이션
- [ ] CartService (add, remove, update, get)
- [ ] /api/cart 엔드포인트
- [ ] CartAgent (cart_add, cart_view, cart_update)
- [ ] CartPanel 컴포넌트
- [ ] ChatInterface 연동

### Phase 2: 멀티턴 대화
- [ ] Intent 분류 확장
- [ ] 검색결과 컨텍스트 저장
- [ ] "첫 번째꺼" 상품 선택 처리
- [ ] 연속 쇼핑 플로우
- [ ] 대화 히스토리 개선

### Phase 3: UI 완성
- [ ] CartPanel 수량 조절/삭제
- [ ] 다중 상품 Invoice
- [ ] PaymentButton (목업)
- [ ] OrderStatus 컴포넌트
- [ ] Toast 알림

### Phase 4: 실제 연동 (이후)
- [ ] 스크래핑 안정화
- [ ] 환율 API 연동
- [ ] PayPal 실제 연동
- [ ] Shopify 실제 연동
- [ ] Webhook 처리
- [ ] 이메일 알림

---

## 10. Phase 1-2 구현 완료 현황 (2025-12-14)

### 10.1 구현 완료 항목 ✅

#### Phase 1: 핵심 개선

| 항목 | 파일 | 상태 |
|------|------|------|
| **Slot Filling** | `lib/agent/shopping-state.ts` | ✅ 완료 |
| **Guardrails** | `lib/agent/guardrails.ts` | ✅ 완료 |
| **Cultural Context** | `lib/agent/cultural-context.ts` | ✅ 완료 |

#### Phase 2: 중기 개선

| 항목 | 파일 | 상태 |
|------|------|------|
| **3-Tier Extraction Cascade** | `lib/scraper/cascade-extractor.ts` | ✅ 완료 |
| **Semantic Router** | `lib/agent/semantic-router.ts` | ✅ 완료 |
| **LLM 비용 추적** | `lib/agent/usage-tracker.ts` | ✅ 완료 |

### 10.2 아키텍처 업데이트

#### LLM-First Orchestrator

기존 룰 기반 오케스트레이터 대신 LLM-first 접근 방식 도입:

```
사용자 메시지
    │
    ▼
┌─────────────────────────────────────────┐
│        Semantic Router (Fast Path)       │
│        ~20ms, 95% 요청 처리              │
└────────────────────┬────────────────────┘
                     │ 매칭 실패 시
                     ▼
┌─────────────────────────────────────────┐
│        LLM Decision Engine               │
│        ~800ms, 5% 애매한 요청            │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│        Action Executor                    │
│        search, add_to_cart, etc.         │
└─────────────────────────────────────────┘
```

#### 3-Tier Extraction Cascade

스크래핑 비용 80% 절감:

```
Tier 1: JSON-LD (~50ms, FREE)     → ~40% 성공
    ↓
Tier 2: CSS Selectors (~200ms)    → ~30% 성공
    ↓
Tier 3: LLM Fallback (~800ms)     → ~30% 사용
```

### 10.3 신규 데이터베이스 필드

`prisma/schema.prisma` Product 모델 확장:

```prisma
model Product {
  // ... 기존 필드

  // Phase 2: 3-Tier Cascade 메타데이터
  description      String?
  brand            String?
  rating           Float?
  reviewCount      Int?
  inStock          Boolean?
}
```

### 10.4 성능 개선 결과

| 메트릭 | 이전 | 현재 | 개선율 |
|-------|------|------|-------|
| Intent 분류 | ~800ms | ~20ms | **40x** |
| Product 추출 | ~800ms | ~150ms | **5x** |
| 월간 LLM 비용 (50K DAU) | ~$2,750 | ~$765 | **72%↓** |

### 10.5 구현 상세 문서

자세한 내용은 다음 문서 참조:
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - 구현 현황
- [LLM_AGENT_ARCHITECTURE.md](./LLM_AGENT_ARCHITECTURE.md) - LLM 아키텍처

---

**문서 끝**

> **버전**: v1.0.0 (2025-12-14 업데이트)
> 이 문서는 PayNShip MVP 개발을 위한 종합 설계서입니다.
> Phase 1-2 구현이 완료되어 구현 현황이 업데이트되었습니다.
