# Orchestration E2E 테스트 리포트

> 테스트 일시: 2025-12-09
> 테스트 환경: LM Studio + GPT-OSS-20B
> 서버: localhost:3000

---

## Step 1: 단일 턴 테스트

### 1-1. Search Action ✅ PASSED
**입력**: `"BTS 앨범 찾아줘"`

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| success | true | true | ✅ |
| action | search | search | ✅ |
| UI component | product_grid | product_grid | ✅ |
| products.length | > 0 | 3 | ✅ |
| 응답 시간 | < 60s | ~2s | ✅ |

**sessionId**: `79f79686-090c-4173-8d02-bbb69bfb3735`

**검색 결과**:
1. BTS - Proof (Standard Edition) - ₩55,000
2. BLACKPINK - Born Pink (Box Set) - ₩42,000
3. NewJeans - Get Up (Bunny Beach Bag Ver.) - ₩28,000

**Memory 업데이트**:
- `lastSearchQuery`: "BTS 앨범"
- `lastSearchResults`: 3개 상품
- `userPreferences.llmNotes`: "User is interested in BTS albums."

---

### 1-2. Show Product (with context) ⚠️ PARTIAL
**입력**: `"첫번째꺼 보여줘"` (sessionId: 79f79686...)

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| success | true | true | ✅ |
| action | show_product | (none/text) | ⚠️ |
| UI component | product_card | action_buttons | ❌ |
| lastViewedProduct | 설정됨 | 미설정 | ❌ |

**응답 내용**:
"네, 마지막 검색 결과의 첫 번째 상품은 'BTS - Proof (Standard Edition)' 앨범입니다! 가격은 ₩55,000원이에요..."

**발견된 이슈**:
- LLM이 컨텍스트에서 첫번째 상품을 정확히 식별했으나, `product_card` UI가 반환되지 않음
- `lastViewedProduct` 메모리 업데이트 누락
- orchestrator에서 show_product action 처리 로직 검토 필요

---

### 1-3. Add to Cart
**입력**: `"담아줘"` (sessionId 필요)

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| success | true | - | - |
| action | add_to_cart | - | - |
| UI component | cart_summary | - | - |
| cartSummary.itemCount | +1 | - | - |

**Raw Response**:
```json
// 테스트 대기중...
```

---

### 1-4. Show Cart
**입력**: `"장바구니 보여줘"`

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| success | true | - | - |
| action | show_cart | - | - |
| UI component | cart_summary | - | - |

**Raw Response**:
```json
// 테스트 대기중...
```

---

### 1-5. Checkout
**입력**: `"결제할게"` (장바구니 필요)

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| success | true | - | - |
| action | checkout | - | - |
| UI component | address_form | - | - |

**Raw Response**:
```json
// 테스트 대기중...
```

---

## Step 2: Rule-Based 분기 테스트

### 2-1. 빈 장바구니 결제 시도
**입력**: `"결제할게"` (새 세션, 장바구니 비어있음)

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| LLM 호출 | 없음 (Rule-based) | - | - |
| 응답 | "장바구니가 비어있어요" | - | - |
| 응답 시간 | < 100ms | - | - |

---

### 2-2. 상품 없이 담기 시도
**입력**: `"담아줘"` (새 세션, 상품 미선택)

| 항목 | 기대값 | 실제값 | 결과 |
|------|--------|--------|------|
| LLM 호출 | 없음 (Rule-based) | - | - |
| 응답 | "어떤 상품을 담을까요?" | - | - |

---

## Step 3: Happy Path 시나리오 A

### 전체 플로우
```
Turn 1: "BTS 앨범 찾아줘" → product_grid
Turn 2: "첫번째꺼" → product_card
Turn 3: "담아줘" → cart_summary
Turn 4: "결제할게" → address_form
```

| Turn | 입력 | 기대 action | 기대 UI | 실제 결과 |
|------|------|-------------|---------|----------|
| 1 | BTS 앨범 찾아줘 | search | product_grid | - |
| 2 | 첫번째꺼 | show_product | product_card | - |
| 3 | 담아줘 | add_to_cart | cart_summary | - |
| 4 | 결제할게 | checkout | address_form | - |

**sessionId**: (테스트 시 기록)

---

## Step 4: Context Reference 테스트

### 4-1. 지시대명사 처리
| 입력 | 컨텍스트 | 기대 결과 | 실제 결과 |
|------|----------|----------|----------|
| "두번째꺼 어때?" | 검색 결과 3개 | lastSearchResults[1] 참조 | - |
| "그거로 할게" | 상품 보는 중 | lastViewedProduct 참조 | - |

---

## 발견된 이슈

| # | 설명 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | LM Studio (GPT-OSS-20B)가 action=none 반환 | 중 | 대기 |
| 2 | show_product 후 lastViewedProduct 미설정 | 높 | 수정 필요 |
| 3 | Gemini Rate Limit (429) 발생 | 중 | LM Studio 대체 테스트 |
| 4 | 세션 컨텍스트 로드 간헐적 실패 | 중 | 조사 중 |
| 5 | product_card UI 미반환 (show_product 시) | 높 | 수정 필요 |

---

## LLM Provider 비교 테스트

| Provider | 테스트 | action 정확도 | UI 반환 | 응답 시간 |
|----------|--------|--------------|---------|----------|
| **Gemini** | 1-1 Search | ✅ search | ✅ product_grid | ~2s |
| **Gemini** | 1-2 Show | ⚠️ none (text만) | ❌ action_buttons | ~2s |
| **LM Studio** | 1-1 Search | ❌ none | ❌ 없음 | ~29s |

### 분석
- **Gemini**: 검색은 잘 동작, show_product 시 product_card UI 미반환
- **LM Studio**: JSON Schema 준수하나 action 선택 정확도 낮음
- 권장: Gemini 사용 (Rate Limit 관리 필요)

---

## 테스트 요약

| 카테고리 | 전체 | 통과 | 부분 | 실패 | 미실행 |
|----------|------|------|------|------|--------|
| 단일 턴 | 5 | 1 | 1 | 1 | 2 |
| Rule-based | 2 | - | - | - | 2 |
| Happy Path | 4 | - | - | - | 4 |
| Context | 2 | - | - | - | 2 |
| **합계** | **13** | **1** | **1** | **1** | **10** |

### 결론
1. **Gemini 사용 시**: 기본 검색(search action)은 정상 동작
2. **컨텍스트 기반 참조**: "첫번째꺼" 등 인식하나 product_card UI 미반환
3. **Rule-based 분기**: 아직 미구현, LLM에 모든 판단 위임 중
4. **LM Studio**: 응답 시간 길고 action 선택 정확도 낮음

### 다음 단계
- [ ] show_product 액션 시 lastViewedProduct 설정 및 product_card 반환 수정
- [ ] Rule-based 분기 로직 구현 (빈 장바구니 체크 등)
- [ ] 세션 컨텍스트 로딩 안정화
- [ ] Gemini Rate Limit 대응 (캐싱 또는 대기)
