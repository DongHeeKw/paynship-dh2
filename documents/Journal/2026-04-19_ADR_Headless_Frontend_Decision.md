# Headless Frontend (Next.js) over Shopify Theme Embedding (v2.0)

> **Date**: 2026-04-19
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

v2.0 설계에서 AI 채팅형 프론트를 (a) Shopify Theme(Liquid)에 코드를 임베드할지, (b) Headless Next.js가 Shopify를 백엔드로 호출할지 결정이 필요했다. v1에 이미 Next.js 자산이 있고, AI 채팅은 SSE 스트리밍·SPA 상호작용이 핵심이다.

---

## Decision

**Headless Next.js 프론트엔드를 유지**하고 Shopify를 Backend-of-Record로만 사용한다.

- AI 채팅, 상품 검색/스크레이핑, 장바구니, 대시보드(옆 pane) 전부 Next.js에서 구현
- **Checkout만 Shopify로 Handoff**: Draft Order 생성 → `invoiceUrl`로 고객을 Shopify Checkout 페이지로 리다이렉트
- 결제 완료 후 Shopify가 고객에게 확인 이메일 자동 발송
- 주문 이후 추적은 우리 프론트 + Shopify Admin 병행 가능

### 2-Pane 레이아웃 (데스크톱 ≥ md)

```
┌────────────────────────────────────────────────────────────────┐
│  Header (로고 · 통화 토글 · 로그인 · 장바구니 아이콘)           │
├──────────────────────────────┬─────────────────────────────────┤
│                              │                                   │
│    Chat (left, ~60%)         │   Dashboard (right, ~40%)        │
│                              │                                   │
│   - 메시지 스트림            │   - 장바구니 탭                    │
│   - URL 입력/파일/이미지     │   - 주문 관리 탭                   │
│   - 상품 카드                │   - 배송 추적 탭                   │
│                              │   - 검수 알림 (Inspection 72h)     │
│                              │                                   │
└──────────────────────────────┴─────────────────────────────────┘
```

### Mobile (≤ sm)

- 단일 컬럼, 하단 Tab bar로 Chat ↔ Dashboard 전환

---

## Rationale

### Headless 장점

1. **AI 채팅 UX 자유**: SSE 스트림, Server Actions, Suspense, React 에코시스템 활용
2. **현재 자산 재활용**: 이미 구현된 `/chat`, Scraper Client, Agent 파이프라인 유지
3. **2-pane 레이아웃**: Liquid theme으로는 구현 난도 매우 높음
4. **개발 속도**: Vercel deploy + Next.js HMR로 iteration 빠름
5. **무거운 JS 번들 관리**: Theme app extension 메모리 한계 회피

### Shopify Theme 임베드 기각 사유

- Liquid는 서버 렌더링 템플릿 언어 → AI SSE 스트리밍 구현 제약
- App Bridge + App Extension 방식도 2-pane SPA에는 과도
- 체크아웃 customization은 어차피 Checkout Extensibility로 일부 가능

### Checkout만 Shopify로 Handoff

- PCI DSS 부담을 Shopify + PortOne에 위임
- 고객에게 친숙한 결제 UX
- 환불/재결제/분쟁 처리가 Shopify Admin에서 가능

---

## Consequences

### Positive

- AI 채팅 경험 풀 컨트롤
- Vercel Edge Network 활용
- v1 자산 100% 재활용

### Negative

- SEO는 스토어프런트 대비 약함 (채팅 기반은 검색 대상이 아닌 것이 자연스럽지만)
- Shopify Theme의 마케팅 기능(상품 검색, 컬렉션 페이지) 일부 부재 → AI 검색으로 대체
- Checkout 스타일링 한계 (Shopify 기본 UI)

### Risks

- Shopify Checkout 장애 시 전환 실패 → 그러나 Shopify SLA > 우리 자체 구축 가능성
- Draft Order → Checkout handoff의 URL 세션 만료 관리 필요 (기본 만료 ~2h)

---

## Implementation

- Next.js 15 App Router 유지
- `app/(storefront)/chat/page.tsx` (명칭 변경 고려)
- `app/(storefront)/_components/DashboardPane.tsx` (신규)
- Checkout flow: `POST /api/checkout` → `draftOrderCreate` → `invoiceUrl` → redirect
- Customer authentication: Supabase Auth는 우리 세션, Shopify Customer는 결제 시 매핑

### Customer Account Sync

```
Supabase Auth login (이메일·Google)
   │
   ▼
   User.id / User.email 확인
   │
   ▼
   Shopify `customerSearch(email)` 호출
   │
   ├─ Hit → User.shopifyCustomerId 매핑
   └─ Miss → Shopify `customerCreate` → 매핑
   │
   ▼
   Draft Order 생성 시 customerId 첨부
```

---

## Related

- [ADR: Shopify_Full_Backend](2026-04-19_ADR_Shopify_Full_Backend.md)
- [04 Customer Frontend PRD](../master-plan/04_CUSTOMER_FRONTEND_PRD.md)
