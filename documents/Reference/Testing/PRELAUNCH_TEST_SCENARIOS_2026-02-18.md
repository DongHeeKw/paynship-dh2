# Prelaunch Test Scenarios (2026-02-18, rev 2026-02-19)

## 목적
- 운영 전 필수 보완 항목(결제/권한/웹훅/배포/어드민 플로우)에 대한 테스트 시나리오를 표준화한다.
- 수동 검증을 자동화 가능한 케이스로 분류해 릴리즈 게이트를 만든다.

## 릴리즈 게이트
- `P0` 시나리오: 100% 통과 필수
- `P1` 시나리오: 95% 이상 통과, 미통과 항목은 운영 영향도/우회안 문서화
- `P2` 시나리오: 베타 운영 중 병행

## 테스트 환경
- `Local`: 개발자 환경, Mock/Fallback 검증
- `Staging`: 운영과 동일한 Shopify/Supabase/Scraper 연결
- `Prod-like`: 실제 webhook signature, 실제 결제(소액) 검증

## 공통 테스트 데이터
- 테스트 사용자 2명 (`user_a`, `user_b`) + 관리자 1명 (`admin_a`)
- 단건 quote 1건, 장바구니 quote 1건
- `domesticShipping > 0` 인 상품 2건
- Shopify draft order 생성 가능한 스토어/상품 상태

## 시나리오 목록

### 1) 권한/보안 (P0)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| SEC-ADM-001 | P0 | E2E | 비관리자 `/admin` 접근 차단 | 비로그인 또는 일반유저로 `/admin` 진입 | `/`로 리다이렉트 | Playwright |
| SEC-ADM-002 | P0 | API | 비관리자 admin API 차단 | 일반유저로 `/api/admin/orders` 호출 | `403 ADMIN_REQUIRED` | Vitest(route) |
| SEC-ADM-003 | P0 | API | 관리자 admin API 허용 | 관리자 토큰으로 `/api/admin/orders` 호출 | `200` + 데이터 반환 | Vitest(route) |
| SEC-CART-001 | P0 | API | cart/item 소유자 수정 허용 | 소유 세션으로 `PUT /api/cart/item` | `200`, item 수량 반영 | Vitest(route) |
| SEC-CART-002 | P0 | API | cart/item 타인 세션 수정 차단 | 타인 세션으로 `PUT /api/cart/item` | `403 SESSION_ACCESS_DENIED` | Vitest(route) |
| SEC-CART-003 | P0 | API | cart/item 타인 세션 삭제 차단 | 타인 세션으로 `DELETE /api/cart/item` | `403 SESSION_ACCESS_DENIED` | Vitest(route) |
| SEC-ROLE-001 | P0 | API | viewer 주문 수정 차단 | viewer 권한으로 `PATCH /api/admin/orders/:id` | `403`, `minimumRole=operator` | Vitest(route) |
| SEC-ROLE-002 | P0 | API | operator 설정 수정 차단 | operator 권한으로 `PATCH /api/admin-settings` | `403`, `ADMIN_ROLE_REQUIRED` | Vitest(route) |
| SEC-ROLE-003 | P0 | API | super_admin 설정 수정 허용 | super_admin 권한으로 `PATCH /api/admin-settings` | `200` | Vitest(route) |
| SEC-ROLE-004 | P0 | API | viewer 상품 보강 실행 차단 | viewer 권한으로 `POST /api/products/:id/enrich` | `403`, `minimumRole=operator` | Vitest(route) |

### 2) 결제/주문 플로우 (P0)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| PAY-CHK-001 | P0 | API | quote 기반 checkout 생성 | 로그인 유저가 `POST /api/checkout` | `200`, `checkoutUrl(invoiceUrl)` 반환 | Vitest(route + mock Shopify) |
| PAY-CHK-002 | P0 | API | 타인 quote checkout 차단 | `user_b`가 `user_a` quote로 checkout 시도 | `403` | Vitest(route) |
| PAY-CHK-003 | P0 | API | 만료 quote checkout 차단 | `validUntil` 만료 quote checkout 시도 | `400` 만료 메시지 | Vitest(route) |
| PAY-CHK-004 | P0 | API | Shopify 비활성 시 checkout 차단 | shopify disabled 상태에서 checkout 호출 | `503` | Vitest(route) |
| PAY-ORD-001 | P0 | API | 직접 주문 생성 차단 | `POST /api/orders` 호출 | `405 ORDER_CREATION_WEBHOOK_ONLY` | Vitest(route) |
| PAY-ORD-002 | P0 | API | 소비자 주문 PATCH 차단 | `PATCH /api/orders/:orderId` 호출 | `405 ORDER_PATCH_ADMIN_API_ONLY` | Vitest(route) |
| PAY-TRK-001 | P1 | API/UI | 결제 반영 대기 상태 조회 | `/orders?quoteId=...` 진입 후 `GET /api/orders/payment-status` 폴링 | `PAYMENT_PENDING -> ORDER_CONFIRMED` 전이, 주문 자동 선택 | Playwright + Vitest(route) |
| PAY-TRK-002 | P1 | API/UI | 웹훅 실패 상태 노출 | `orders/paid` webhook 실패 이벤트 존재 상태에서 `/orders?quoteId=...` 조회 | `WEBHOOK_FAILED` 배너 + 수동 새로고침 가능 | Playwright + Vitest(route) |
| PAY-UI-001 | P1 | E2E | 챗 결제 버튼 동작 | quote 생성 후 checkout 실행 | 성공 메시지 + 주문모달 + Pay Now 링크 | Playwright |

### 3) 웹훅/결제 연계 (P0)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| WEBHOOK-001 | P0 | API | `orders/paid` 정상 처리 | 유효 HMAC + `quote_id` 포함 payload 전송 | `200`, order `PAID` 생성/업데이트 | Integration test |
| WEBHOOK-002 | P0 | API | `quote_id` 미포함 payload | 유효 HMAC + quote_id 없는 payload | `200`, 주문 생성 없음, 경고 로그 | Integration test |
| WEBHOOK-003 | P0 | API | 잘못된 HMAC 차단 | 위조 HMAC로 webhook 호출 | `401` | Vitest(route) |
| WEBHOOK-004 | P0 | API | 처리 실패 시 재시도 유도 | processWebhook 강제 실패 | `500` 반환 | Vitest(route mock) |
| WEBHOOK-005 | P1 | E2E | Shopify 실결제 후 상태 반영 | 실제 소액 결제 후 webhook 수신 | 주문 상태 `PAID` + admin 주문조회 반영 | Staging manual |

### 4) 견적/가격 정확도 (P0)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| QUOTE-001 | P0 | API | 단건 quote 국내배송비 반영 | `domesticShipping > 0` 상품으로 quote 생성 | `domesticShippingUsd > 0` | Vitest(route) |
| QUOTE-002 | P0 | API | 장바구니 quote 국내배송비 합산 | 복수상품 장바구니 quote 생성 | 각 상품 국내배송비 합산 반영 | Vitest(route) |
| QUOTE-003 | P1 | API | 환율 fallback 검증 | 환율 API 실패 시나리오 | fallback 환율로 계산 + 에러 없음 | Vitest(mock) |

### 5) 상품 보강/통관 데이터 (P1)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| ENRICH-001 | P1 | API | `tavily` 모드 보강 | `POST /api/products/:id/enrich?mode=tavily` | `success` + 변경필드/신뢰도 반환 | Vitest(route) |
| ENRICH-002 | P1 | API | `rescrape` 모드 보강 | `POST /api/products/:id/enrich?mode=rescrape` | 원본 재수집 후 변경 반영 | Integration test |
| ENRICH-003 | P1 | UI | 어드민 모드 선택 반영 | 상품 상세 모달에서 `rescrape` 선택 후 보강 | 결과 뱃지/변경값 표시 | Playwright |
| UNIPASS-001 | P1 | API | UNI-PASS 실 API 경로 | API key + endpoint 설정 후 조회 | 응답 파싱 + ApiUsage `service=unipass` 기록 | Integration test |
| UNIPASS-002 | P1 | API | UNI-PASS fallback | UNI-PASS 미설정 상태 조회 | mock 결과 반환 + 서비스 중단 없음 | Vitest(mock) |

### 6) 어드민 운영 플로우 (P1)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| ADMIN-UI-001 | P1 | E2E | `/admin/analytics` 접근 | 관리자 로그인 후 사이드바 분석 클릭 | 404 없이 페이지 렌더 | Playwright |
| ADMIN-UI-002 | P1 | UI | API Usage `unipass` 노출 | `unipass` 로그 데이터 생성 후 화면 진입 | `UNI-PASS Customs` + 아이콘 표시 | Playwright |
| ADMIN-ORD-001 | P1 | API | 주문목록 `itemCount` 파싱 | object/array cartSnapshot 데이터 혼합 | itemCount 정확 | Vitest(route) |
| ADMIN-ORD-002 | P1 | API | 주문상세 items 파싱 | object cartSnapshot + productSnapshot 케이스 | items 렌더 가능 포맷 반환 | Vitest(route) |
| ADMIN-ORD-003 | P0 | API | 주문 상태 전이 위반 차단 | `PENDING -> DELIVERED` PATCH | `409 ORDER_TRANSITION_INVALID` | Vitest(route) |
| ADMIN-ORD-004 | P0 | API | SHIPPED 전환 시 운송장 필수 | `PROCESSING -> SHIPPED` + tracking 없음 | `409 ORDER_TRACKING_REQUIRED` | Vitest(route) |
| ADMIN-ORD-005 | P1 | API | 주문목록 real/demo 분리 | `GET /api/admin/orders?mode=demo` | demo 주문만 반환, `isDemo=true` | Vitest(route) |
| ADMIN-WEBHOOK-001 | P1 | API | webhook 운영 로그 조회 | `GET /api/admin/shopify/webhooks` | paginated logs + correlation/processing status | Vitest(route/integration) |
| ADMIN-ROLE-UI-001 | P1 | UI | viewer 주문 상세 read-only | viewer로 `/admin/orders/[id]` 진입 | 수정 버튼 disabled + 안내 배너 노출 | Playwright |
| ADMIN-ROLE-UI-002 | P1 | UI | viewer 상품 운영 액션 차단 | viewer로 `/admin/products` 진입 | 수정/보강/일괄동기화 disabled | Playwright |
| ADMIN-ROLE-UI-003 | P1 | UI | viewer 로그 정리 차단 | viewer로 `/admin/logs` 진입 | 로그 정리 버튼 disabled | Playwright |

### 7) 배포/운영 준비도 (P0)

| ID | Priority | 유형 | 시나리오 | 절차 | 기대 결과 | 자동화 권장 |
|---|---|---|---|---|---|---|
| OPS-DEP-001 | P0 | CLI | predeploy 스크립트 검증 | `npm run predeploy:check -- --skip-tests` | lint/type-check/build 모두 통과 | CI + 수동 |
| OPS-DEP-002 | P0 | CI | GitHub Actions 파이프라인 | PR 생성 후 CI 실행 | lint/type-check/test:ci/build 통과 | GitHub Actions |
| OPS-DEP-003 | P0 | 문서 | env 문서 정합성 | `.env.example` vs 코드 변수명 대조 | Shopify/UNI-PASS 변수 mismatch 없음 | 리뷰 체크리스트 |
| OPS-DEP-004 | P1 | 운영 | 스테이징 smoke test | 배포 후 핵심 경로(`/`, `/admin`, checkout, webhook) 점검 | 장애 없이 정상 응답 | runbook |

## 실행 순서 (권장)
1. `P0 API` (권한, 결제, 웹훅, 배포 스크립트)
2. `P0 CLI/CI` (`test:ci`, `predeploy:check`, GitHub CI)
3. `P1 UI/E2E` (admin analytics, enrichment mode, api usage)
4. `P1 Integration` (UNI-PASS 실 API, Shopify 실결제)

## 자동화 우선순위 백로그
- 즉시 추가: `WEBHOOK-003`, `WEBHOOK-004`, `PAY-CHK-002`, `PAY-CHK-003`
- 다음 스프린트: `PAY-UI-001`, `ADMIN-UI-001`, `ENRICH-003`
- 스테이징 전용: `WEBHOOK-005`, `UNIPASS-001`

## 완료 기준 (DoD)
- 이 문서의 `P0` 전 케이스 결과가 테스트 리포트에 기록됨
- 실패 케이스는 이슈 링크 + 우회안 + 재검증 일정 포함
- 배포 태그 생성 전 `OPS-DEP-001~003` 확인 완료
