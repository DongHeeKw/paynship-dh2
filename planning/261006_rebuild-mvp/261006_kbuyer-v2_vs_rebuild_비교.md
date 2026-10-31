# PayNShip 코드베이스 비교 — kbuyer-v2 vs rebuild

> 작성 2026-10-06 · 대상 독자: 박요한, 김도윤 (기반 코드 결정용 논의 자료)
> 딱지: `[실측]` 코드·git·npm에서 직접 확인 · `[문서]` 레포 문서에만 기재 · `[가설]` 추론 · `[미조사]` 확인 안 함
> 이 문서는 어느 git 레포에도 속하지 않는 `paynship/docs/`에 둔다 (커밋·푸시 없음).

---

## 0. 결론 먼저

> **2026-10-06 보완:** 처음 작성할 때는 "Shopify Full Backend"(v2.0 ADR) 전제를 충분히 반영하지 못했다. 이 전제로 다시 따져본 결과는 §9에 있다. 결론은 바뀌지 않는다(B 기반). 대신 **Shopify의 역할을 공식적으로 다시 정의하는 ADR이 선행 조건**으로 추가됐다. Gemini 모델 재평가는 [261006_gemini_모델_재평가.md](./261006_gemini_모델_재평가.md)에 따로 정리했다. 핵심은 B 기본 모델 `gemini-2.5-flash`가 이 키로 호출 불가라는 점이다.

1. **기반은 김도윤 rebuild(B)로 삼는 것을 권고한다.** 돈 흐름(상태 머신·감사 로그·기한 sweeper·2단계 결제·환불)과 관세 계산이 A보다 정확하고 테스트가 있다. A의 v2.0 엔진 3종은 호출처가 0인 고아 모듈이다. `[실측]`
2. **A에서 B로 옮길 것은 "기능 몇 개 + 결정 사항"뿐이다.** 다통화 환율(신한/KEXIM), 채팅 UI·i18n, 관리자 화면, CS 핸드오프, 9단계 표시 매핑, box-split 정도다. git merge가 아니라 항목별 이식으로 한다.
3. **B도 기술적으로는 이미 낡았다.** 주요 라이브러리가 최신 메이저보다 1~2단계 뒤처져 있고, LLM 기본값은 `gemini-2.5-flash`이며, 서비스의 핵심인 대화형 에이전트는 코드가 0이다. → **기반 통합 → 업그레이드 → 에이전트 신규 설계**의 순서로 단계를 분리한다.
4. **정책 충돌 7건은 코드보다 먼저 합의가 필요하다** (§5). 특히 수수료 기준과 US de minimis가 그렇다.

---

## 1. 세 갈래의 현황

| | 로컬 `kbuyer` | **A: `kbuyer-v2`** | **B: `kbuyer-latest/rebuild`** |
|---|---|---|---|
| 원격 | maybedy/kbuyer | paynshipcompany/paynship-v2 | maybedy/kbuyer `main` |
| 마지막 커밋 | 2026-04-19 | 2026-05-20 | 2026-07-14 |
| 주 작성자 | — (스냅샷) | 박요한 (paynshipcompany) | 김도윤 (rebuild 113커밋, 6/1~) |
| 구조 | v1 Next 단일 앱 | v1 앱 + v2.1 Shopify 헤드리스 덧댐 | pnpm·turbo 모노레포 (app 2 · package 8 · worker 1) |
| 배포 | — | **운영 중** `paynship-v2.vercel.app` (Vercel Hobby + Supabase) | docker compose만 동작. 클라우드 배포는 Phase 8 목표, 미구성 `[실측/문서]` |
| 결제 | — | `ENABLE_MOCK_CHECKOUT=true` (운영도 mock) `[실측]` | Shopify Draft Order 인보이스. 미설정 시 503 `[실측]` |

- maybedy `main`에는 rebuild 외에 **레거시 루트 앱도 계속 고쳐져 있다.** 6/11~12에 money deadlock 수정, IDOR 수정, 테스트 962개가 들어갔고(커밋 메시지 기준), 7/14에 감사 대응 수정이 있었다. **A에는 이 수정이 하나도 없다.** `[실측]`
- 4/15 NextAuth 전환과 4/20 S05 모델 추가도 김도윤 쪽에만 있다. A는 그 이전 Supabase Auth 기준이다. `[실측]`

---

## 2. 기술 스택 신선도 (2026-10-06 npm 기준)

| 라이브러리 | A (lock) | B (lock) | npm 최신 | 비고 |
|---|---|---|---|---|
| next | 15.5.18 | 15.5.18 | **16.3.8** | 메이저 1단계 뒤 |
| react | 18.3.1 | 19.2.6 | 19.3.0 | A는 메이저 뒤처짐 |
| prisma / @prisma/client | 6.19.3 | 6.19.3 | **7.10.0** | 메이저 1단계 뒤 |
| @google/genai | 1.52 | 1.52 | **2.27.0** | 메이저 1단계 뒤 |
| @anthropic-ai/sdk | 0.71.2 | 없음 | 0.131.0 | |
| @shopify/shopify-api | 11.14.1 | 미사용 (GraphQL 직접 호출) | 15.0.0 | API 버전: A 2025-07/10, B **2025-01** |
| zod | — | 3.25.76 | **4.6.5** | |
| typescript | 5.9.3 | 5.9.3 (선언 5.4~5.6 혼재) | **7.0.2** | |
| vitest | 4.1.6 | **1.6.1과 2.1.9 혼재** | 5.0.3 | B 내부 불일치 |
| pnpm | — | 9.12.0 | 12.9.1 | |

출처: 각 레포 lockfile과 `npm view` `[실측]`

**판단:** B는 6월에 시작했지만 템플릿 버전이 오래돼 출발부터 뒤처졌다. 업그레이드는 기반 통합이 끝난 뒤 별도 단계로 한 번에 하는 게 맞다. 메이저별 브레이킹 체인지 검토 범위는 `[미조사]`다.

---

## 3. AI 엔진 현황

| | A | B |
|---|---|---|
| LLM 쓰는 곳 | 채팅 에이전트(의도 분류 fallback), 스크래퍼 3단계 추출, 보강 | **상품 정보 추출 1곳뿐.** HS 분류의 LLM 단계는 보류, critical-field 단계는 NOOP `[실측]` |
| 기본 모델 | `gemini-3-flash-preview` (preview, 호출 가능) | `gemini-2.5-flash` (`packages/config/src/index.ts:148`). **현재 키로 404 — 호출 불가** `[실측 2026-10-06]` |
| 대체 경로 | Claude, LM Studio | `claude -p` / `codex exec` CLI를 프로세스로 띄움. 결과는 저신뢰(`cli_agent`)로만 저장 `[실측]` |
| 대화형 에이전트 | 있음. semantic router(패턴) → LLM fallback, 액션 10개 (2025년식) | **SPEC_STUB, 코드 0.** 설계도 "결정적 분류기 → Gemini fallback" 같은 구조 `[문서]` |

**제안** `[가설]`:
- **에이전트는 이식하지 말고 새로 설계한다.** 최신 모델의 tool use 기반으로 만들고, B의 도메인 서비스(견적 게이트, 장바구니 견적, 체크아웃, 주문 조회)를 도구로 노출한다.
  - 가격·관세는 B의 원칙 그대로 둔다. LLM이 정하지 않고, verified-only 게이트를 통과한 값만 쓴다.
  - 이 경우 `CONVERSATIONAL_AGENT.md` 스펙을 먼저 고쳐 써야 한다.
- **추출 모델은 하드코딩된 기본값을 바꾸기 전에 측정부터 한다.** B에 이미 있는 라벨 코퍼스 하네스(`crawl-cost-harness` 스킬)로 필드별 자동 검증률과 비용을 비교한다. 다만 이 하네스는 라벨 코퍼스가 아직 없어서 비어 있다. `[실측]`
- CLI 에이전트 추출은 운영 컨테이너에 CLI 설치와 인증이 필요하다. 운영용으로 맞는지 재검토가 필요하다. `[가설]`

---

## 4. 기능별 대응표

권고 범례: **B 사용** = A 것 폐기 · **이식** = A에서 B로 옮김 · **결정** = 합의 필요

| # | 영역 | A | B | 권고 |
|---|---|---|---|---|
| 1 | 환율 | 신한(10시 스크래핑) → KEXIM fallback, 표시 통화 8개, 일 1회 cron | KRW/USD 한 쌍, 관리자 수동 입력만 가능. 면세 판정용 환율은 하드코딩 | **이식**: provider를 `packages/providers`로, cron은 worker sweeper로, ExchangeRate를 다통화로 확장 |
| 2 | Catalog Pivot (퍼지 상품 매칭) | 4단계 매칭. 호출처 0 | 해시 일치만 사용 | **결정**: 필요하면 `similarity.ts`를 순수 함수로 이식 |
| 3 | 관세·컴플라이언스 | `preflightCheck` 호출처 0. US $800 면세 가정 | de minimis 5가지 모델, FTA min(FTA, MFN), HS 누락 시 throw, US 면세 없음 | 관세는 **B 사용**. box-split(위험물·검역 분리)만 **이식** (B 코드에 없음). 금지품목 검사는 양쪽 다 없음 |
| 4 | Cost-Gate | stub(본인 주석), 호출처 0 | 비용 순 6단계 fetch + QuoteGateService. 연결됨 | **B 사용** |
| 5 | 9단계 진행 표시 | enum 17개 → 고객용 9단계. 타임라인에서 사용 중 | OrderStatus 14개 + 구매 Task 6개 | **이식**: 상태를 늘리지 말고 표시 매핑만 view 레이어로 |
| 6 | 검수·포기 만료 | 72h/48h 일일 cron + 창고 검수 관리자 화면 | 서비스 + sweeper 15개 + 감사 로그. 화면 없음 | 로직은 **B 사용**, 관리자 화면만 **이식** |
| 7 | Shopify | 상품·variant mirror, Markets 8통화, checkout review. 스토어 `ehj0yx-zs` 하드코딩 | Draft Order(USD 1라인) + `orders/paid` 정산 + 환불 실행기 | 결제·정산·환불은 **B 사용**. mirror·Markets는 **결정**. API 버전 통일 필요 |
| 8 | 인증 | Supabase + 3단계 점진 인증 | 관리자는 임시 토큰, 고객은 게스트(체크아웃 시 이메일). NextAuth는 Phase 7 예정 | **결정**: Supabase vs NextAuth |
| 9 | UI | 2-pane 채팅, 랜딩, i18n, 관리자 16개 화면 | 화면 10개(URL 폼 → 견적 → 결제 → 주문). 영어만, 장바구니 UI 없음 | **이식**: 채팅·i18n·관리자 화면 |
| 10 | 대화형 에이전트 | 있음 (구식 구조) | 없음 | **신규 설계** (§3) |
| 11 | 스크래퍼 | 약 13.5k LOC + 별도 서버 | 약 8.5k LOC, 필드별 출처·신뢰도 기록 | **B 사용**. 사이트별 selector와 옵션 추출 노하우만 선별 이식 |
| 12 | 가드레일·운영 | pre-commit G1/G2/G4, Sentry, Vercel cron 8개 | CI(의존 방향·금액 하드코딩·SSoT 검사), docker | **이식**: G2·G4·Sentry. G1(작성자 강제)은 계정 정책에 따라 **결정** |
| 13 | A에만 있는 것 | CS 핸드오프, 주문 컨텍스트 배너, 랜딩 이벤트 분석, ops 알림, 장기 메모리, 재무·SLA 관리자 API | 없음 | **이식**: CS 핸드오프·배너·랜딩 분석·ops 알림 / 나머지는 필요할 때 |

B에만 있는 것: 2단계 차액 청구, 환불·반품·차지백·포기 상태 머신, 작업 큐(OpsTask), Outbox, AsyncJob, 기한 sweeper, 감사 로그, 약관 3종 페이지. `[실측]`

---

## 5. 정책 충돌 — 코드보다 먼저 합의할 것

| # | 쟁점 | A (`yohan-docs/v2.2`) | B (rebuild 코드·문서) | 메모 |
|---|---|---|---|---|
| P1 | **수수료** | 상품가 × 10%, 최소 $5, Detail 검수 셀러당 $7 | 10% × (상품가 + **국제배송비**). 최소 수수료 $3은 시드에만 있고 계산에는 미적용 `[실측]` | A 문서 안에서도 ADR과 policy가 서로 다름 |
| P2 | 취소·환불 | 단계별 매트릭스 (1D~1E는 수수료 50%, 1H 이후 상품가 80%) | 소싱 전 $0, 소싱 후 왕복 비용 + $5 | |
| P3 | **US de minimis** | Section 321 $800 이하 관세 $0 (문서·코드 모두) | 면세 없음 (주석 근거 "EO 14388, 2026-02") | B가 현행에 맞다고 보지만 **법무·관세사 확인 필요** |
| P4 | EU | 라인당 3.5 USD 미만 | €3 / HS 4자리 heading 그룹 (2026-07-01~) | |
| P5 | 통화 | 스토어 USD + 표시 통화 8개 | 견적·청구 모두 USD, 다통화 보류 | |
| P6 | 호스팅 | Vercel Hobby 유지 (일 1회 cron만 가능) | Vercel + 컨테이너 호스트 + 관리형 PG. 문서는 1분 주기 cron을 가정 | B 구조는 Hobby로 못 돌린다. 비용 결정 필요 |
| P7 | 스토어·플랜 | `ehj0yx-zs`, Basic → Grow → Advanced 단계 상향 | 문서에 결정 없음 (env 값) | A 결정을 B 문서에 반영하면 됨 |

---

## 6. 지금 운영 중인 A의 리스크

- 운영 결제가 mock이어서 **실제 돈은 오가지 않는다.** 따라서 money deadlock 미수정의 실피해는 현재 없다. `[실측: ENABLE_MOCK_CHECKOUT=true]`
- 다만 A로 실결제를 켜면 6월 이전의 교착 버그를 그대로 안고 가게 된다. 김도윤의 6/11~12 수정을 A로 옮기려면 cherry-pick 비용이 든다. **A로는 실결제를 켜지 않는다**를 원칙으로 두는 것을 권고한다. `[가설: 커밋 범위로 추론, 줄 단위 대조는 안 함]`
- Supabase free tier는 7일 idle이면 일시정지된다. 4개월 넘게 방치됐으므로 이미 정지됐을 가능성이 높다. `[가설, 미확인]`

---

## 7. 합의가 필요한 결정 목록 (미팅 안건)

1. **기반 코드:** B(rebuild)로 단일화할지. A는 동결하고 운영 URL은 B 배포 시 전환.
2. **정책 P1~P7** 확정. 특히 수수료 기준과 US de minimis(법무 확인 포함).
3. **호스팅·예산:** B 런타임(웹 + 워커 + 브라우저 사이드카 + PG)을 어디에 둘지와 월 비용.
4. **인증:** Supabase vs NextAuth.
5. **Shopify 범위:** Draft Order만 쓸지, 상품 mirror + Markets 다통화 표시까지 갈지.
6. **대화형 에이전트:** 기존 스펙 그대로 갈지, tool use 기반으로 다시 쓸지 (§3 제안).
7. **업그레이드 시점:** 통합 직후 일괄로 할지, 출시 후로 미룰지.
8. 5/16 공동창업자 전달 문서에 있던 결정 요청 5건의 현재 유효성.
9. **Shopify 역할 재정의 ADR** (§9.6). v2.0 Full Backend를 "자체 원장 + Shopify는 결제·환불·알림"으로 대체할지 정한다.
10. **기본 LLM 모델 교체.** B의 `gemini-2.5-flash`는 호출이 불가하다. 추출은 `gemini-3.5-flash-lite`, 에이전트는 `gemini-3.7-flash`를 권고한다([모델 재평가](./261006_gemini_모델_재평가.md)).

---

## 8. 제안 진행 순서

| 단계 | 내용 | 끝났다고 보는 기준 |
|---|---|---|
| 0 | 합의 (§7) | 결정 8건 기록 |
| 1 | B 로컬 기동 | docker compose 기동, B STATUS가 미검증으로 남긴 DB 테스트까지 포함해 전체 테스트 green |
| 2 | 정책 반영 | P1~P7을 B의 config·시드·DESIGN_CANON에 반영 |
| 3 | A 이식 | §4의 "이식" 항목. 환율 → 관리자 화면 → CS 핸드오프 → 9단계 표시 → box-split 순 |
| 4 | 기술 업그레이드 | §2 메이저 일괄 업그레이드, vitest 버전 통일, Shopify API 버전 통일 |
| 5 | 대화형 에이전트 신규 | 스펙 재작성 → 도구 = 도메인 서비스 → 채팅 UI 연결 |
| 6 | 출시 준비 | B 릴리스 차단 4건, 요율 데이터(FTA·배송·HS), e2e, 배포, 운영 URL 전환 |

---

## 9. Shopify 관점 재검토 (2026-10-06 보완)

### 9.1 원래 전제
v2.0 ADR(`yohan-docs/v2.0/documents/Journal/[yohan v2.0] 2026-04-19_ADR_Shopify_Full_Backend.md`)의 핵심 문장은 다음과 같다. 결정자는 "Doyun + Claude"로 적혀 있다. `[문서]`
> "회원·상품·결제·세금·배송·추적·마케팅·자동화 전체를 Shopify에 위임한다. 자체 DB는 스크레이핑·카탈로그 매칭·국내 발주 관리·Compliance 등 'Shopify가 모르는 도메인 로직'에만 집중"

### 9.2 이미 무너진 부분
v2.2(`migration/SHOPIFY_PLAN_MATRIX.md`, `planning/12_admin-dashboard.md`)가 이미 다음 영역을 자체 구현으로 돌렸다. Basic/Grow 플랜 제약 때문이다. `[문서]`

| 영역 | 처음 계획 | v2.2에서 바뀐 것 |
|---|---|---|
| 고객 계정 | Shopify Customer | Supabase 메인 + Shopify 동기화 |
| DDP(관세 선납) | Shopify Duties | 자체 계산 → line item에 추가 |
| 배송 요율 | Shopify 실시간 요율 | AcrossB API 직접 호출 |
| 운영 콘솔 | Shopify Admin | 1차 작업은 자체 `/admin` |
| 분석 | Shopify Reports | 자체 분석 |
| 출고·환불 | Shopify에서 자동 처리 | 수동 처리 |

**원래 Shopify에 맡기기로 한 15개 영역 중 6~7개가 이미 자체 구현이다.** 문서 스스로 "Full Backend"를 "Shopify = 결제 + 일부 운영 도구"로 줄여 놓은 셈이다.

### 9.3 영역별 정합성 `[실측]`
○ 잘 맞음 · △ 부분적으로 맞음 · ✕ 맞지 않음

| 영역 | v2.0 의도 | A 실제 | B 실제 | A | B |
|---|---|---|---|---|---|
| 상품 카탈로그 | Shopify productCreate | mirror로 상품 생성 | Shopify에 상품 안 만듦 | ○ | ✕ |
| 체크아웃 금액 | Shopify Draft Order | **클라이언트가 보낸 가격을 그대로 사용(변조 가능)**, 수수료·DDP는 화면에만 표시하고 청구 안 함 | 서버 견적 게이트 통과 금액 1줄 | △ | △ |
| 주문 원장 | Shopify 주문 | 웹훅에서 metadata만 남김 | 자체 Postgres(의도적 설계) | △ | ✕ |
| 고객 | Shopify Customer | Supabase만 | 게스트 이메일 | ✕ | ✕ |
| DDP | Shopify | 5% 추정치를 표시만 | 7개국 2026 규칙으로 계산·청구 | ✕ | ✕ (사업상으로는 ○) |
| 출고·추적 | fulfillmentCreate → Shopify 알림 | v1 스토어 코드만 | 없음 | △ | ✕ |
| 환불 | Shopify Refund | v1 클라이언트로 호출 | 워커가 refundCreate 실행 | △ | ○ |
| 운영 콘솔 | Shopify Admin → v2.2에서 자체 | 15개 메뉴 | 주문 화면만 | ○ | △ |
| Markets·통화 | Shopify Markets | 스크립트와 표시 통화 | 없음 | ○ | ✕ |
| Checkout UI Extensions E1~E7 | 7종 | 문서만 | 없음 | ✕ | ✕ |

- **B 문서는 Shopify를 "결제 수단"으로 명시한다.** 근거: `EXTERNAL_INTEGRATIONS.md:13` "Payment rail, fulfillment record", `CUSTOMER_JOURNEY.md:126` "PayNShip is the landed-cost SSoT; Shopify is the payment processor".
- **다만 v2.0을 뒤집는 결정 기록(ADR)은 없다.** B는 v2.0 스냅샷 이전 지점(v1.0, 4/16)에서 갈라져 나왔고, rebuild 문서에는 "Full Backend", 스토어 `ehj0yx`, v2.2 같은 언급이 전혀 없다.
- **B 문서와 코드도 어긋난다.** DESIGN_CANON은 상태 전이 때 Shopify에 태그 붙이기(`tagsAdd`)와 상품 게시(`publishProduct`)를 약속하지만, 코드에는 `tagsAdd`, `productCreate`, `fulfillmentCreate`가 하나도 없다.

### 9.4 Shopify가 못 하는 일과 B가 Shopify와 겹치는 일
- **Shopify로는 불가능해서 어느 쪽이든 자체 구현이 필요한 것:**
  - 한국 판매처 발주, 창고 입고·검수
  - 스크래핑으로 정해지는 가격과 견적 검증
  - 실측 후 2차 차액 청구
  - Basic 플랜에서의 DDP와 국가별 관세 규칙
  - 장시간 작업의 재처리
- **B의 강점 중 Shopify와 겹치는 것:** 고객 알림 메일, 출고 기록, 환불 원장 일부. 겹치는 쪽은 작고, B의 강점 대부분은 Shopify가 못 하는 영역이다.

### 9.5 2차 결제와 Shopify 주문
- **A:** 2차 결제가 **v1 스토어**로 갈 수 있다. 결과적으로 1차는 v2 스토어, 2차는 v1 스토어로 갈라질 위험이 있다. `[실측]`
- **B:** 결제 단계마다 Draft Order를 따로 만들고, 둘을 이어주는 연결은 Postgres에만 있다. 환불은 1차 주문 기준으로만 실행하므로, **2차 금액까지 포함한 환불은 실패할 위험이 있다**(`refund-processor.ts:48`). `[실측]`
- **공통:** Shopify Admin에서 보면 한 고객의 주문이 서로 연결 표시 없이 두 건으로 보인다. "Shopify가 주문 원장"이라는 전제는 2차 결제 구조와 근본적으로 맞지 않는다.

### 9.6 보완된 권고
1. **Shopify 역할 재정의 ADR을 쓴다(선행 조건).** 원장은 자체 DB로 두고, Shopify는 결제 수납·환불 실행·고객 알림·(선택) 상품 게시를 맡는다. 이 ADR이 v2.0 Full Backend ADR을 대체한다. 김도윤 님과 함께 서명한다.
2. **B 위에 얹을 Shopify 보강:**
   - Draft Order를 금액 항목별 줄로 나눈다(상품 / 수수료 / 배송 / 관세·세금). 그래야 Shopify Admin과 리포트에서 금액을 읽을 수 있다.
   - Outbox에 `fulfillmentCreate`, `tagsAdd`를 추가해 Shopify 고객 알림을 활용한다.
   - 2차 결제 Draft Order에 1차 주문번호를 note/tag로 남긴다.
   - 2차 결제분 환불 경로를 보완한다.
3. **A에서 가져올 것:** Markets 스크립트, 표시 통화, (필요하면) 상품 mirror.
4. **A에서 버릴 것:** 클라이언트가 보낸 가격을 그대로 믿는 `/api/draft-order`, 5% DDP 표시값, v1/v2로 갈라진 스토어 경로.
5. **Checkout UI Extensions는 브랜딩 수준으로만 한정한다.** 결제가 한 줄짜리라 상품별 정보(E2)를 보여줄 수 없다.

→ §7 결정 안건에 **9번 "Shopify 역할 재정의 ADR"** 을 추가한다.

---

## 부록 — 근거 위치

- B 현황: `kbuyer-latest/rebuild/docs/00_Master/STATUS.md` (2026-07-13), `ROADMAP.md`, `docs/01_Architecture/DESIGN_CANON.md`, `docs/90_AsIs/ISSUE_LEDGER.md` (레거시 이슈 161건: P0 25)
- B 수수료: `rebuild/packages/pricing/src/compute-quote.ts` · 관세: `packages/pricing/src/duty.ts` · 상태 머신: `packages/domain/src/state-machine.ts`
- A 결정: `kbuyer-v2/yohan-docs/v2.2/README.md`, `migration/SHOPIFY_PLAN_MATRIX.md`, `planning/09_policy.md`, `STATUS_FOR_COFOUNDER_2026-05-16.md`
- A 고아 엔진: `kbuyer-v2/lib/{catalog,compliance,scraping}/`
- 레거시 분기 규모: `git -C kbuyer-latest diff --stat 1d58757 HEAD -- app lib prisma` → 158 파일, +14,318 / −2,662
