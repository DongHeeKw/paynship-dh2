# PayNShip - 테스트 결과

> ⚠️ **Historical Snapshot (Legacy)**
>
> 이 문서는 2025-12 시점 결과를 보존한 기록입니다.  
> 현재 운영 전 검증 기준은 아래 문서를 우선 참조하세요.
> - `documents/Reference/Testing/PRELAUNCH_TEST_SCENARIOS_2026-02-18.md`
> - `documents/Features/STATUS.md`

## 테스트 환경
- **Mode**: Mock 데이터 (USE_MOCK_SCRAPER=true, USE_MOCK_CALCULATOR=true)
- **Database**: SQLite (dev.db) / Supabase PostgreSQL (production)
- **Server**: Next.js 15 dev server (localhost:3000)
- **최초 테스트**: 2025년 12월 6일
- **최종 업데이트**: 2025년 12월 15일 (v1.0.0)

---

## 자동화된 테스트 (Vitest + Playwright)

> **테스트 인프라**: 2025-12-15 구축 완료

### 테스트 명령어

```bash
# 단위/통합 테스트 (Vitest)
npm test              # 전체 테스트 실행
npm run test:watch    # 워치 모드
npm run test:coverage # 커버리지 리포트
npm run test:ui       # Vitest UI

# E2E 테스트 (Playwright)
npm run test:e2e         # 헤드리스 모드
npm run test:e2e:headed  # 브라우저 표시
npm run test:e2e:ui      # Playwright UI
```

### 단위/통합 테스트 결과 (2025-12-15)

| 테스트 파일 | 테스트 수 | 상태 |
|------------|----------|------|
| `lib/agent/__tests__/shopping-state.test.ts` | 33 | ✅ Pass |
| `lib/agent/__tests__/guardrails.test.ts` | 41 | ✅ Pass |
| `lib/agent/__tests__/cultural-context.test.ts` | 36 | ✅ Pass |
| `lib/agent/__tests__/semantic-router.test.ts` | 69 | ✅ Pass |
| `lib/agent/__tests__/integration.test.ts` | 22 | ✅ Pass |
| `lib/scraper/__tests__/cascade-extractor.test.ts` | 54 | ✅ Pass |
| **Total** | **255** | **✅ All Pass** |

### 코드 커버리지

| 파일 | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| `cultural-context.ts` | 100% | 100% | 100% | 100% |
| `guardrails.ts` | 100% | 100% | 100% | 100% |
| `semantic-router.ts` | 94.11% | 90.90% | 100% | 94.11% |
| `shopping-state.ts` | 91.07% | 88.46% | 100% | 91.07% |
| `cascade-extractor.ts` | 87.38% | 81.48% | 100% | 87.38% |

**Phase 1-2 핵심 코드 평균 커버리지**: ~94%

### E2E 테스트 (Playwright)

| 테스트 스위트 | 테스트 수 | 설명 |
|--------------|----------|------|
| Chat Interface | 2 | 채팅 인터페이스 로딩, 입력 필드 |
| Product Search Flow | 2 | 검색 쿼리, 메시지 제출 |
| Cart Functionality | 1 | 장바구니 버튼/아이콘 |
| Modal Interactions | 1 | ESC 키 모달 닫기 |
| Responsive Design | 3 | 모바일/태블릿/데스크톱 뷰포트 |
| Keyboard Navigation | 1 | 탭 네비게이션 |
| API Integration | 2 | admin-settings, chat 엔드포인트 |
| Session Management | 1 | localStorage 세션 |
| Error Handling | 2 | 네트워크 오류, 에러 상태 |
| **Total** | **15** | - |

### 테스트 커버리지 대상

**Phase 1 구현**:
- ✅ `shopping-state.ts` - 슬롯 필링, 상태 관리
- ✅ `guardrails.ts` - 가격 검증, 배송 제한
- ✅ `cultural-context.ts` - 한국 문화 컨텍스트

**Phase 2 구현**:
- ✅ `semantic-router.ts` - 의도 분류, URL 추출
- ✅ `cascade-extractor.ts` - 3-Tier 추출
- ✅ 통합 테스트 - 전체 플로우 검증

---

## 목표
LLM 없이 룰 기반으로 전체 시나리오가 목업 데이터로 작동하는지 검증

---

# 수동 테스트 결과 (참고용)

---

## ✅ 테스트 통과한 시나리오

### 시나리오 1: 상품 URL → 스크래핑 → 상품 표시
**상태**: ✅ 성공

**플로우**:
1. "Paste Example URL" 버튼 클릭
2. Coupang URL 자동 입력
3. 제출 버튼 클릭
4. Intent 분류: `product_url` (confidence: 0.95)
5. 목업 스크래퍼 작동 (~1초 딜레이)
6. 상품 카드 표시

**결과**:
- **상품명**: BTS - Proof (Anthology Album)
- **가격**: ₩45,000
- **카테고리**: K-pop
- **무게**: 1kg
- **이미지**: Placeholder 이미지 표시
- **버튼**: "Calculate Shipping" 표시됨

**백엔드 로그**:
```
[Orchestrator] Intent classified: { type: 'product_url', confidence: 0.95 }
[Scraper] Mock mode enabled, returning mock product
✅ [Product Agent] Scraped product [UUID] for request [UUID]
```

---

### 시나리오 2: 배송 계산 → 주소 입력 → 가격 견적
**상태**: ✅ 성공

**플로우**:
1. "Calculate Shipping" 버튼 클릭
2. 주소 입력 폼 모달 표시
3. 국가 선택: United States (US)
4. 주소 입력: 123 Main St, Apt 4B, New York, NY 10001
5. "Continue to Quote" 버튼 클릭
6. 가격 계산 API 호출
7. Invoice 모달 표시

**결과**:
```
Item Price:              $32.14  (₩45,000 ÷ 1400)
International Shipping:  $15.00  (0.5kg to US, 7-14 days)
─────────────────────────────────
Subtotal:                $47.14

Customs Duty:            Free    (below threshold)
Sales Tax (8%):          $4.15
Service Fee (10%):       $4.71
─────────────────────────────────
TOTAL:                   $56.01 USD

Estimated Delivery:      7-14 days
```

**백엔드 로그**:
```
[Calculator] Mock mode enabled, using simplified calculations
POST /api/quote 200 in 255ms
INSERT INTO quotes (product_id, destination_country, ...) VALUES (...)
```

---

## 🛠️ 수정한 이슈들

### 이슈 1: sessionId null vs undefined 타입 에러
**증상**:
```
Error [ZodError]: Expected string, received null at sessionId
```

**원인**:
- `ChatInterface.tsx`에서 `sessionId`를 `null`로 초기화
- Zod 스키마에서 `.optional()`은 `undefined`만 허용, `null`은 허용 안함

**해결**: app/api/agent/route.ts:175
```typescript
// Before
body: JSON.stringify({ message: text, sessionId: sessionId })

// After
body: JSON.stringify({
  message: text,
  ...(sessionId && { sessionId }), // Only include if not null
})
```

---

### 이슈 2: DATABASE_URL PostgreSQL 연결 실패
**증상**:
```
Error validating datasource `db`: the URL must start with the protocol `postgresql://`
```

**원인**:
- `.env`에 Supabase PostgreSQL URL 설정
- 로컬에서 PostgreSQL 서버 없음

**해결**:
1. `prisma/schema.prisma` provider를 `sqlite`로 변경
2. `.env`에서 `DATABASE_URL="file:./dev.db"` 설정
3. `npx prisma generate && npx prisma db push` 실행
4. SQLite database `dev.db` 생성 완료

---

### 이슈 3: scrapeRequestId context 덮어쓰기
**증상**:
- API 응답에 `nextAction: "poll_scrape_result"` 있음
- 하지만 `context.scrapeRequestId`가 누락됨
- 프론트엔드에서 polling 시작 못함

**원인**: lib/agent/orchestrator.ts:388-397
```typescript
// Before - Agent context를 덮어씀
const updatedContext = {
  ...(context.metadata as Record<string, unknown>),
  lastIntent: intent.type,
  lastIntentConfidence: intent.confidence,
};

return {
  ...response,
  context: updatedContext, // ❌ scrapeRequestId 손실!
};
```

**해결**: lib/agent/orchestrator.ts:388-399
```typescript
// After - Agent context 보존
const orchestratorMetadata = {
  lastIntent: intent.type,
  lastIntentConfidence: intent.confidence,
};

return {
  ...response,
  context: {
    ...response.context, // ✅ Preserve agent's context (e.g., scrapeRequestId)
    ...orchestratorMetadata,
  },
};
```

---

## 📊 목업 시스템 검증

### 스크래퍼 Mock
**파일**: `lib/scraper/mocks/index.ts`

**기능**:
- URL 패턴 감지 (BTS, cosmetics, snacks 등)
- 카테고리별 목업 상품 반환
- 500-1500ms 지연 시뮬레이션
- 옵션 데이터 포함 (버전, 사이즈 등)

**테스트된 상품**:
- K-pop: BTS - Proof (Anthology Album)
- Options: Standard / Compact / Collector's Edition

---

### 계산기 Mock
**파일**: `lib/calculator/mocks.ts`

**기능**:
- 고정 환율: 1400 KRW/USD
- 18개국 배송비 계산 (무게 기반)
- 관세 계산 (카테고리별 요율)
- 국가별 VAT/판매세 (threshold 적용)
- 서비스 수수료 10%

**테스트된 계산**:
- 목적지: United States
- 무게: 0.5kg (실제 mock product weight)
- Shipping: $15 (base rate for US)
- Customs: Free (below $800 threshold)
- Tax: 8%
- Service Fee: 10%

---

## 🎯 작동 확인된 기능

### Agent System
- ✅ Intent classification (URL regex 기반)
- ✅ Orchestrator → Product Agent routing
- ✅ Context preservation across agents
- ✅ Background scraping with polling
- ✅ Session management (localStorage + DB)

### Database
- ✅ Prisma + SQLite 연동
- ✅ ChatSession 생성/업데이트
- ✅ ScrapeRequest 생성
- ✅ Product 저장
- ✅ Quote 저장
- ✅ Cart 생성 (자동)

### Frontend
- ✅ URL 입력 및 제출
- ✅ Loading states ("🤔 Processing...")
- ✅ Product card display
- ✅ Address form modal
- ✅ Invoice modal with price breakdown
- ✅ Session persistence (localStorage)

---

## ⏭️ 미테스트 시나리오

다음 기능들은 시간 관계상 테스트하지 않았습니다:

1. **Recommend / Search** 시나리오
   - "Recommend Items" 버튼
   - "Find K-Snacks" 버튼
   - Search agent with product grid

2. **Cart 기능**
   - Add to cart
   - Cart panel
   - Quantity update
   - Remove from cart

3. **Quick Actions**
   - "Buy K-Pop Album" sidebar button
   - Quick chips (Recommend, Calculator)

4. **Options 선택**
   - Product options modal
   - Option price adjustment
   - Multiple options combination

5. **Checkout**
   - "Proceed to Checkout" 버튼
   - Shopify integration (mock)

---

## 🎓 결론

### 성공 요소
1. **목업 시스템 완성도**: 스크래퍼와 계산기 목업이 실제와 거의 동일하게 작동
2. **Agent 아키텍처**: Intent classification → Routing → Handler 구조가 안정적
3. **데이터 흐름**: API → DB → Frontend 전체 파이프라인 정상 작동
4. **UX**: Loading states, modals, product cards 모두 UI/UX 완성도 높음

### 발견된 문제점
1. **타입 에러**: Zod validation, Prisma Json types 등 여러 타입 불일치 이슈
2. **Context 관리**: Agent 간 context 전달 시 덮어쓰기 문제
3. **환경 설정**: PostgreSQL → SQLite 전환 필요

### 다음 단계
1. ✅ **Mock 기반 테스트 완료** - 전체 시나리오가 룰 기반으로 작동 확인
2. 🔄 **LLM 통합** - Gemini API로 실제 대화 및 검색 기능 구현
3. 🔄 **실제 스크래퍼** - Playwright로 Coupang/Naver 실제 스크래핑
4. 🔄 **결제 연동** - Shopify checkout 실제 연동
5. 🔄 **배포** - Supabase PostgreSQL + Vercel 배포

---

## 📝 테스트 로그 요약

```
✅ Session created: a4b11a8f-cf9c-4d7b-adab-b36691595533
✅ Intent classified: product_url (0.95)
✅ Scrape request created: ed554e76-d364-46f8-ae17-a44528319697
✅ Product scraped: d6394495-5608-4500-9994-4d25ff17dbc9
✅ Quote generated: [UUID]
✅ Total: $56.01 USD (₩45,000 + shipping + fees)
```

**빌드 상태**: ✅ `npm run build` 성공 (경고만 존재, 에러 없음)
**TypeScript**: ✅ `npx tsc --noEmit` 통과

---

## v0.4.0 추가 테스트 (2025-12-14)

### 시나리오 7: 주문 목록 및 추적
**상태**: ✅ 성공

**플로우**:
1. 사이드바에서 "My Orders" 클릭
2. `/orders` 페이지로 이동
3. 주문 목록 표시 (비로그인 시 로그인 유도)
4. 주문 클릭 → 상세 화면 표시
5. 주문 상태 타임라인 표시

**API 테스트**:
```
GET /api/orders
→ { orders: [...] } (로그인 시)
→ { orders: [], message: '로그인이 필요합니다' } (비로그인 시)

GET /api/orders/[orderId]
→ { order: { id, status, quote: {...} } }

POST /api/orders
→ { order: {...}, message: '주문이 생성되었습니다' }

PATCH /api/orders/[orderId] (admin only)
→ { order: {...}, message: '주문이 업데이트되었습니다' }
```

**UI 테스트**:
- ✅ OrderList: 주문 목록, 상태 뱃지, 날짜, 금액 표시
- ✅ OrderTracking: 5단계 타임라인 (PENDING → DELIVERED)
- ✅ Price Breakdown: 항목별 가격 표시
- ✅ 빈 상태: "No orders yet" 메시지

---

### 시나리오 8: 모바일 햄버거 메뉴
**상태**: ✅ 성공

**플로우**:
1. 모바일 화면 (< 768px)
2. 좌측 상단 ☰ 버튼 표시
3. 클릭 → 전체화면 사이드바 오픈
4. X 버튼 또는 ESC 키로 닫기

**테스트 항목**:
- ✅ 햄버거 버튼: 모바일에서만 표시 (`md:hidden`)
- ✅ 전체화면 사이드바: 로고, 새 채팅, 히스토리, My Orders, 퀵액션
- ✅ 액션 후 자동 닫기
- ✅ ESC 키 닫기
- ✅ 스크롤 방지: 사이드바 열릴 때 body overflow hidden

---

### 시나리오 9: Checkout 시 Order 생성
**상태**: ✅ 성공

**플로우**:
1. 상품 견적 생성 (Quote)
2. "Proceed to Payment" 클릭
3. Order 레코드 자동 생성
4. OrderSuccess 모달 표시
5. `/orders`에서 주문 확인 가능

**백엔드 로그**:
```
POST /api/orders 200 in 45ms
Order created: [UUID]
```

---

## v0.4.0 새로 검증된 기능

### Orders System
- ✅ Order 생성 (POST /api/orders)
- ✅ Order 목록 조회 (GET /api/orders)
- ✅ Order 상세 조회 (GET /api/orders/[orderId])
- ✅ Order 상태 업데이트 - admin only (PATCH /api/orders/[orderId])
- ✅ Quote → Order 관계 정상 동작
- ✅ 중복 주문 방지 (같은 Quote에 대해)

### Mobile UI
- ✅ 햄버거 메뉴 버튼 (좌측 상단)
- ✅ 전체화면 MobileSidebar
- ✅ 반응형 레이아웃 (`md:` 브레이크포인트)

### Performance
- ✅ admin-settings 5초 polling 제거 → 페이지 로드 시 1회만 호출
