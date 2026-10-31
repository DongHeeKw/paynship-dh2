# HANDOFF — PayNShip MVP 이어서 개발하기

> 작성 2026-10-06 · **개정 2026-10-07 (계획 문서 v0.3 — G0 완료, 결정 확정 · 오후 추가 확정: 합포장 · D-a~D-k · D3 · 일정 조정)** · 작성 박요한 (with Claude) · 받는 사람: rhkr9080@gmail.com (GitHub `DongHeeKw`)
> 이 문서 하나로 "어디에 무엇이 있고, 무엇부터 하면 되는지"를 알 수 있게 썼다. 세부는 링크를 따라간다.

---

## 1. 30초 요약

- **서비스**: 해외 K-팬이 한국 상품 URL 하나로 **결제 전에 확정된 관세 포함 총액(DDP, USD)** 을 보고, AI 채팅으로 사서 받는 구매대행.
- **상황**: 같은 서비스 코드가 세 갈래였다. **B(rebuild)를 단일 기반**으로 통합하고, 미국 소프트런칭으로 첫 매출(2027-01 말 목표, G0 후 약 16주)을 내는 것이 목표다.
- **지금 단계**: 계획 문서 **v0.3**(정책서 · 요구정의 · 통합 PRD · 레드팀 QA · 변경 시트 · 약관 개정안 목록). **G0 완료(2026-10-07)** — 결정은 모두 **확정**이다(§8). 최종 결정은 박요한. 코드는 B 에 Gemini 모델 교체 1건만 반영됐다.
- **첫 작업**: M0 — 교착 수정 4건 · 릴리스 블로커 4건 · CI Postgres(아래 §7). M0 가 끝나면 바로 main 교체(D2). 비즈니스부터 이해하려면 §3.

---

## 2. 레포와 브랜치 — `paynshipcompany/paynship-v2` (private)

> **받는 분(DongHeeKw) 접근 방법** — 공유용 사본 **`johnjuhee/paynship-v2`** 를 **읽기 전용 토큰**으로 받는다(박요한이 따로 전달, 2027-01-04 만료).
> 사본은 운영 레포와 같은 `main` · `rebuild` 를 갖고, 업데이트가 있으면 박요한 측이 함께 올린다. 토큰으로는 **pull 만 되고 push 는 막혀 있다**(403).
>
> ```bash
> git config --global credential.helper osxkeychain        # Windows·Linux 는 Git Credential Manager
> git clone https://github.com/johnjuhee/paynship-v2.git    # 사용자 이름: 아무 값, 비밀번호: 받은 토큰
> cd paynship-v2 && git fetch origin && git checkout rebuild
> ```
> 토큰을 원격 주소(URL)에 넣지 말 것. 개발한 내용을 올려야 할 때가 되면 쓰기 권한을 따로 요청한다.


| 브랜치 | 내용 | 비고 |
|---|---|---|
| `main` | **A — 운영 중인 kbuyer-v2** (Next 단일 앱) + **계획 문서** `planning/261006_rebuild-mvp/` + 이 `HANDOFF.md` + **유효 약관 6종** `docs/external-inputs/2026-04-15-policies/terms/` + 박요한 v2.2 기획 `yohan-docs/v2.2/` | **push 하면 Vercel 운영(`paynship-v2.vercel.app`)이 자동 배포된다** |
| `rebuild` | **A' + B** — 김도윤 레포(`maybedy/kbuyer`) main 최신(2026-07-14 `8fe14ec`) + Gemini 모델 교체 커밋 1개. 루트 = 레거시 앱(A'), `rebuild/` = **통합 기반 B** | **다음 개발은 여기서 한다**(M0 작업 브랜치) |

```bash
# (운영 레포 — 쓰기 권한이 있는 사람용)
git clone https://github.com/paynshipcompany/paynship-v2.git
cd paynship-v2
git checkout rebuild            # 개발 기반
git checkout main -- planning HANDOFF.md   # (선택) 문서를 rebuild 작업 트리로 가져와 보기
```

- 원 출처: B 의 원본 레포는 김도윤 개인 계정 `maybedy/kbuyer`(private). 그 레포의 다른 브랜치(`feat/*` 등)는 옮기지 않았다.
- 결정 **D2(확정)** = "paynship-v2 레포를 정본으로 재사용, main 을 rebuild 로 교체". **main 교체는 M0 완료 직후**에 한다 — 기존 main 을 백업 태그 `a-final` 로 보존하고 Vercel 자동 배포를 해제한 뒤 force push. 실행 전 박요한 확인. 그 전까지는 위 두 브랜치 구조를 유지한다(§7).

---

## 3. 비즈니스 이해하기 — 전략 문서 소개

코드를 보기 전에 **이 서비스가 왜 있고 무엇으로 돈을 버는지** 먼저 잡으면 판단이 빨라진다. 아래는 두 공동창업자의 전략 문서와 유효 약관이고, 읽는 데 2~3시간이면 된다.

### 3.1 핵심만 먼저 (v0.3 기준)

| 항목 | 내용 | 출처 |
|---|---|---|
| 정체성 | 쇼핑몰이 아니라 **결제 · 배송 대행**. 재고 없음. 법인 Next Commerce Inc.(넥스트커머스아이앤씨) d/b/a Pay N Ship. 사업자등록 · 통신판매업 신고 완료 | 약관 T 머리말 · 변경 시트 §1 |
| 고객 | 1순위 **해외 K-Culture 팬**(주문당 $80~200 가정). 해외 거주 한국인은 1차 비대상(영어 UI · 의약품 금지 · 검역) | v2.2 `02_service-plan.md` · 변경 시트 §3.1 |
| 첫 시장 · 카테고리 | 미국 · 영어권, **K-pop · K-뷰티** (역직구 비중 미국 38%) | 예창패 PSST |
| 차별점 | ① **AI 채팅**으로 구매 대행 ② **결제 전 확정되는 관세 포함 총액**(DDP 선결제 — 추가 결제는 예외 3종뿐) ③ Shopify 결제로 선불 신뢰 확보 | `02_핵심_비즈니스_포인트.md` · S1 |
| 경쟁 | 17개 이상의 수동 구매대행(KoreanBuddies · Korgou · 몰테일 등) — "세 가지를 동시에 하는 곳이 없다"(2026-03 기준, 면세 폐지 후 갱신 전 `[미조사]`) | Competitive Brief 2026-03 |
| 수익 | 수수료 = **상품가 × 10%, 최소 $5**(S3 확정) + 국제 배송 마크업 **10%** + 환율 마진 **0.5%**(둘 다 확정 · 설정값) + 부가세 영세율 환급 + 최저가 결제 차익 — 4종 모두 MVP | 변경 시트 §1 수익원 |
| 단위 경제 | 전략 문서의 "공헌이익 $9.90 · 손익분기 월 300건" 은 결제 수수료 · 흡수 손실이 빠진 **낡은 값**. 03 PRD 단위 경제 절에서 다시 계산한다 `[가정]` | 점검 03 §4 |
| KPI | URL→장바구니 ≥25% · 장바구니→결제 ≥60% · 관세 견적 오차 · 통관 실패 ≤0.5% · 상품당 수집 비용 ≤$0.03 · 주문당 운영 ≤8분 · CS 1차 응답 24h | v2.2 `01_master-plan.md` · 03 PRD §10 |
| GTM | Reddit · Discord 커뮤니티 · 초기 할인(Shopify 할인 코드, P-8) | PSST · P-8 |
| 의사결정 | **최종 결정 = 박요한**(D10, 2026-10-07 확정). 개발 = 인수 개발자(`DongHeeKw`) + AI. 김도윤 = 자문 · 리뷰(선택) | 변경 시트 §0 · §1 |

### 3.2 어디서 읽나

**`main` 브랜치 — 유효 약관 (고객 대면 규칙의 정본)**

| 문서 | 무엇을 알 수 있나 |
|---|---|
| `docs/external-inputs/2026-04-15-policies/terms/` **약관 6종**(시행 2026-03-10) — `1. 고객 여정 및 쇼피파이 주문 단계 매핑.md` · `2. Terms and conditions 문서.md` · `3. Orders and Shipping 정책.md` · `4. Delivery 정책.md` · `5. Return and refund 정책.md` · `6. Privacy Policy 정책.md` | 취소 · 반품 · 환불 공식($5 · $10 · 5영업일) · 검수 옵션($0 미개봉 / $7 디테일) · 관세 초과 고객 부담 · 임의 폐기 · Shopify 태그명. `documents/Legal/*` 은 바이트 동일 사본. **$800 면세 문구 등 개정 대상은 약관 개정안 목록 참고** |
| `documents/설립 및 창업준비/Legal/서비스약관_벤치마킹/04_PayNShip_금지품목_가이드.md` | **금지 · 제한 품목 가이드**(DRAFT). 공식 약관에 금지품목 조항이 없어 **유일한 원천** — 견적 단계 금지 판정 목록의 정본 후보(법무 검토 후) |

**`main` 브랜치 — 박요한 측 전략**

| 문서 | 무엇을 알 수 있나 |
|---|---|
| `yohan-docs/v2.2/planning/` **전체(01~12 + README)** | 01 master-plan(비전 · 국가 확장 10→30→54국 · KPI) · 02 service-plan(서비스 정의 · 타깃 · 경쟁 · 차별점) · 03 ai-scraping-scenarios · 04 screen-plan · 05 ia · 06 prd-index · 07 db-schema · 08 infrastructure · 09 policy(수수료 · 취소 · 환불 원안) · **10 test-cases**(이관 대상은 89 §3.7) · 11 wbs-gantt · 12 admin-dashboard. **낡은 사실이 섞여 있다**(아래 ⚠️) |
| `yohan-docs/v2.2/migration/SHOPIFY_PLAN_MATRIX.md` | Shopify 요금제별 제약과 전환 기준(월 $5K → Grow 등 — 현행 요금표 확인 필요) |
| `yohan-docs/v2.2/STATUS_FOR_COFOUNDER_2026-05-16.md` | 5월 시점 상태 · 공동창업자에게 요청한 결정 |
| `documents/설립 및 창업준비/예창패/01_PSST_사업모델_개요.md` · `02_핵심_비즈니스_포인트.md` | **사업 모델 · 시장 규모 · GTM** (가장 압축된 설명. 단위 경제 숫자는 낡음) |
| `documents/Reference/Competitive-Brief-2026-03.md` | 경쟁사 17곳 비교 |
| `documents/설립 및 창업준비/Legal/서비스약관_벤치마킹/` | 약관 초안(02~06, 2026-03). 겹치는 주제는 위 6종이 대체. 금지품목(04) · 서비스 이용규칙(05)만 유일 원천 |
| `docs/briefing.md` | 5월 운영 상태 · 의사결정 원칙 (일부 낡음) |

**`rebuild` 브랜치 — 김도윤 측 전략**

| 문서 | 무엇을 알 수 있나 |
|---|---|
| `rebuild/docs/00_Master/MASTER_PLAN.md` | rebuild 의 북극성("URL 하나로 검증된 DDP 견적") · 왜 다시 만들었나(레거시 이슈 161건) · 범위 밖 |
| `rebuild/docs/02_Journeys/CUSTOMER_JOURNEY.md` · `OPS_JOURNEY_AND_DEADLOCKS.md` | 고객 · 운영 여정과 교착 지점 — 상태 기계의 배경 |
| `rebuild/docs/00_Master/ROADMAP.md` | Phase 0~8 과 관문 |
| `rebuild/docs/01_Architecture/ADR/` | 아키텍처 결정. **`2026-10-07_shopify-hybrid-ledger.md`(S4, Accepted)** · `2026-10-06_gemini-model-refresh.md`(D8, Accepted) — 로컬 작성, 커밋 시점은 별도 |
| `documents/00_Master/MASTER_PLAN.md` | 레거시 앱 시절의 마스터 플랜 |

**두 전략을 합친 결과**
- `planning/261006_rebuild-mvp/plans/261007_v0.3_변경시트.md` — **v0.3 확정 결정의 단일 기준.** 문서끼리 충돌하면 이것이 이긴다.
- `planning/261006_rebuild-mvp/plans/261006_rebuild_통합_머지계획.md` §2(확정 결정 · 충돌 표) — 수수료 기준 · 2차 결제 · 에이전트 우선순위 · 통화 · Shopify 역할을 한 표로 볼 수 있다.
- `planning/261006_rebuild-mvp/plans/261007_약관_개정안_목록.md` — 약관을 어떻게 고칠지(변호사 검토용).

> ⚠️ 전략 문서는 2026-03~05 에 쓰였다. 그 뒤 바뀐 사실이 있다 — **미국 $800 면세는 2025-08 에 이미 정지**(전략 문서 · v2.2 · 약관 DL §1.1 일부는 면세를 가정), 38통화 · KRW 상점 통화 · $500/월 · Gemini 2.5 · Auth Tier 3단계 · 첫 매출 마일스톤(2026-08)은 모두 낡았다(변경 시트 §4). 숫자가 충돌하면 **v0.3 변경 시트와 미국 관세 연구가 최신**이다.

---

## 4. 읽는 순서

1. **이 문서**
2. `planning/261006_rebuild-mvp/README.md` — 문서 입구 · 결정 이력
3. `planning/261006_rebuild-mvp/plans/261007_v0.3_변경시트.md` — **확정 결정(261007) · 일정 · B 동작 오기 정정 E1~E13**
4. `planning/261006_rebuild-mvp/plans/261006_rebuild_통합_머지계획.md` — 왜 B 인가, 단계 M0~M5, 확정 결정 S0~S9 · D1~D10 · P-1~P-9
5. `planning/261006_rebuild-mvp/03_통합PRD_PayNShip-MVP.md` (또는 `.html`) — 범위 · 화면 · **수용 조건(§6)** · 데이터 · 일정
6. `planning/261006_rebuild-mvp/02_요구정의_기능목록.md` — 요구 · 기능 목록 v0.3 (ID 체계 FR-O / FR-C / FR-B)
7. `planning/261006_rebuild-mvp/89_레드팀_사전QA_261006.md` — 함정 16건(v0.3 대체 표기 포함) · **QA 계획(§3, v0.3 추가 §3.7)**
8. `planning/261006_rebuild-mvp/01_정책서_PayNShip-MVP.md` — 정책(배포본은 PPTX v0.3)
9. 약관 6종(§3.2) → `planning/261006_rebuild-mvp/plans/261007_약관_개정안_목록.md`
10. B 자체 문서: `rebuild/CLAUDE.md` → `rebuild/docs/00_Master/ONBOARDING.md` → `STATUS.md` → `01_Architecture/DESIGN_CANON.md` → `01_Architecture/ADR/`

근거 문서(필요할 때): 전략 · 정책 반영 점검 보고서 4건(`researches/261007-전략정책-반영점검/`) · 코드 3갈래 비교 · 고객/운영자 스토리보드 · Gemini 모델 재평가 · 미국 관세 연구(`researches/261006-us-de-minimis/`).

---

## 5. 코드 지도 (B = `rebuild/`)

| 위치 | 하는 일 |
|---|---|
| `apps/web` | Next.js — 고객 화면 · 고객 API · 운영자 API · Shopify 웹훅 |
| `apps/scraper-server` | Hono + Patchright 브라우저 사이드카 (`POST /fetch`) |
| `workers/scrape-worker` | 수집 작업 · **기한 감시(sweeper 15종, 60초)** · Outbox 발송 |
| `packages/domain` | 상태 기계(`src/state-machine.ts`) · 서비스(주문 · 발주 · 검수 · 환불 · 반품 · 차지백 · 작업 큐) |
| `packages/pricing` | `computeQuote` — 순수 함수, 유일한 가격 계산 지점 |
| `packages/db` | Prisma 스키마(모델 38 · enum 22) · 리포지토리 · 시드 |
| `packages/config` | 설정 · AppConfig 키 · 기본값(`src/defaults.ts`) |
| `packages/providers` | 외부 어댑터(Gemini · Shopify · fetch 사다리 · Tavily · Unipass) |
| `packages/extraction` · `contracts` · `scraper-protocol` | 추출 파이프라인 · 공용 zod 스키마 · 스크래퍼 프로토콜 |

**B 의 규칙(rebuild/CLAUDE.md)** — spec → plan → implement → verify. 상태 전이는 domain 에서만, 운영 변경은 `adminMutation` + 감사로그 테스트, `*DeadlineAt` 필드는 sweeper 와 짝, 금액 리터럴 금지(lint `no-hardcoded-money`).

**v0.3 에서 B 설계와 달라지는 곳** — S4(Shopify 하이브리드 원장)는 canon §5 · §7 · CUSTOMER_JOURNEY §4 의 "Shopify = 결제 수단" 원칙을 바꾼다(ADR `2026-10-07_shopify-hybrid-ledger.md`). P-2 무게 버퍼는 canon §9 express 0.5kg 가드를, Section 301 하한은 canon §12.5 를 개정한다. 해당 코드를 만지기 전에 ADR 을 먼저 읽는다.

---

## 6. 로컬 세팅

```bash
cd rebuild
pnpm install                                  # pnpm 9.x
pnpm --filter @paynship/db exec prisma generate
cp .env.example .env                          # 값은 박요한에게 받는다(아래)
pnpm build && pnpm test && pnpm lint && pnpm docs:check
pnpm ops:up                                   # Postgres + migrate + seed + worker + web (docker compose)
```

**함정 (실제로 겪은 것)**
- `vitest` 가 레포 루트의 `postcss.config.mjs`(레거시 앱용, tailwind 필요)를 읽어서 죽는다 → **루트에서 `npm ci --ignore-scripts` 를 한 번** 해 두면 된다.
- Prisma 클라이언트를 생성하지 않으면 `packages/db` 빌드가 타입 에러로 실패한다.
- DB 통합 테스트는 로컬 Postgres(`localhost:7432` 또는 compose 의 7542)가 떠 있어야 돈다. M0 에서 CI 에 Postgres 를 붙인다.
- Gemini: **`gemini-2.5-flash` 는 새 API 키로 404** 다. 기본값은 `gemini-3.5-flash-lite` + thinking `low` 로 바꿔 두었다(커밋 `rebuild` 브랜치 최신, ADR `rebuild/docs/01_Architecture/ADR/2026-10-06_gemini-model-refresh.md` — **Accepted 261007**, 범위 = 추출 모델). 이미 시드된 DB 는 AppConfig `llm.model` 행을 직접 바꿔야 한다.

**환경 변수** — 이름은 `rebuild/.env.example` 에 다 있다. 처음 돌리는 데 필요한 것: `DATABASE_URL` · `DIRECT_URL` · `GEMINI_API_KEY` · `ADMIN_API_TOKEN` · `ADMIN_SUPER_ADMIN_EMAILS`. Shopify · Resend · Slack · Tavily · Naver 키는 해당 기능을 만질 때 받는다. **키 값은 문서 · 커밋 · 원격 주소에 절대 넣지 않는다**(.env 는 gitignore).

---

## 7. 다음 작업 — M0 (10/08~10/16)

작업 브랜치 = `rebuild`(박요한 로컬 사본은 `kbuyer-latest/rebuild`, worktree 브랜치 `sync/origin-main`). push 는 `paynshipcompany/paynship-v2` · `johnjuhee/paynship-v2` 의 `rebuild` 브랜치로 한다(쓰기 권한은 따로 요청).

아래 순서대로 한다.

| # | 작업 | 위치 | 근거 |
|---|---|---|---|
| 1 | **정산 시 발주 작업 자동 생성** (`batchId = null`). `createTask` 는 지금 배치 필수 · `ProcurementTask.orderIntentId @unique` · 상품 컬럼 없음 → 스키마에 `productId` · `lineIndex` · `quantity` 추가, 유니크 해제, 배치 선택값 | `packages/domain/src/services/settlement.ts` · `procurement.ts` · `packages/db/prisma/schema.prisma` | 요구 33.0 · FR-B-030 · 교착 ① · 변경 시트 E8 |
| 2 | **주문 의향 승인 · 거절 API** (승인 시 PaymentRequest · Draft 생성 경로 포함) | `apps/web/app/api/admin/...` + `IntentService` | FR-O-011 · 013 · 교착 ② |
| 3 | **`PENDING_PAYMENT → PURCHASE_FAILED` 전이 + 실패 전파 · 통지** | `state-machine.ts` · `procurement.ts` (`markFailed`) | RT-02 · FR-B-046 |
| 4 | **발주 roll-up 시 `purchasedAt` 기록** (48시간 입고 경보가 안 울림) | `procurement.ts:424` 부근 | RT-11 · FR-B-049 |
| 5 | B 릴리스 블로커 4건 | `rebuild/docs/00_Master/STATUS.md` 상단 | — |
| 6 | CI 에 Postgres 붙여 DB 테스트까지 | `.github/workflows/rebuild-ci.yml` | 머지 계획 M0 |
| 7 | Gemini 모델 교체 PR (ADR Accepted) · A 가드레일 이식(`.env*` 차단 · 타입 체크 · Sentry) | — | D8 · 머지 계획 M0 |

각 항목은 **테스트 먼저**(B 규칙). **M0 완료 조건:** CI 전체 통과(DB 테스트 포함) + 1~4 회귀 테스트(시계 넘김 → 전이 + 알림 + 감사로그) + 블로커 4건 닫힘.

**M0 직후 — main 교체 (D2)** — 기존 main 을 백업 태그 `a-final` 로 보존 → Vercel 자동 배포 해제 → `rebuild/` 히스토리(`git filter-repo --subdirectory-filter rebuild`)로 main force push → Vercel 빌드 설정(모노레포 루트, `apps/web`) · 작성자 훅 재설치 → 공유 사본도 맞춤. force push 라 되돌리기 어렵다. **박요한 확인 후** 실행한다.

그 다음은 M1(메이저 업그레이드, 10/19~10/23) → M2(MVP 코어 + S4 하이브리드 원장, 10/26~11/20 — **첫 주에 Shopify fulfillment 블로커 조사**) → M3(운영 최소셋 + 합포장, 11/23~12/24) → M4(출시, 12/28~2027-01-29) → 첫 실매출 2027-01 말. 단계 관문은 레드팀 문서 §3.2 · §3.7.

---

## 8. 결정 상태 — 확정(261007)

G0 가 2026-10-07 에 끝났다. 아래는 모두 **확정**이다(최종 결정 = 박요한). 전체 목록과 문서 반영 요점은 변경 시트 §1. 구현이 이 표와 다르게 가야 하면 박요한에게 먼저 묻는다.

| 결정 | 내용 | 단계 |
|---|---|---|
| S0 · D1 | B(rebuild) 단일 기반, 기능 단위 이식 | 전체 |
| S1 | **1회 결제 + 예외 경로 3종** — ① 실측 무게 > 버퍼 포함 견적 무게(2차 결제) ② 구매 시점 가격 상승 허용 초과(P-1) ③ 특송사 관세 초과 청구 | M2 · M3 |
| S2 | 에이전트 v0 MVP 포함(도구 7종, 취소 = `cancel_order`) | M2 |
| S3 | 수수료 = 상품가 × 10%, 최소 $5(라벨 "Payment & service fee") — B 는 지금 (상품+국제배송)×10% | M2 |
| S4 | **Shopify 하이브리드 원장** — 주문 · 결제 · 환불 · 출고 · 고객 · 할인 = Shopify / 견적 · 의향 · 결제 요청 · 발주 · 검수 · 운영 상태 · 작업 큐 · 감사로그 · 대화 = 자체 DB. 웹훅 7토픽 · 태그 미러링 · 환불은 `refunds/create` 확인 후 완료 · 일일 대사 | M2 (ADR 2026-10-07) |
| S5 | 국가별 면세 구조 유지 · 미국 = 면세 없음 · 한국산 max(MFN, 12.5%) · 앨범 · CD 예외 | M2 |
| S6 | USD 결제 + 표시 통화 8 | M2 |
| S7 | 최저가 비교 · Catalog Pivot MVP. 스캔 결과는 **운영자 전용**(견적 상품가 = 고객 URL 판매가) | M3 |
| S8 · D9 | 인프라 월 $100 이하(Shopify 구독료 · 결제 수수료 제외) | M4 |
| S9 · P-7 | PortOne + PayPal 병행 준비, 먼저 끝난 하나로 출시 | 외부 |
| D2 | paynship-v2 재사용, main 교체는 M0 완료 후(`a-final` 태그 + 자동 배포 해제) | M0 직후 |
| D6 | 검수 72h 무응답 = 그대로 발송(B 기본값 `ACCEPT` 와 같음) | M3 |
| D7 | 결제 전 로그인 필수 | M2 |
| D8 | Gemini ADR Accepted = 추출 `gemini-3.5-flash-lite`(low). 에이전트 `gemini-3.7-flash` 는 에이전트 스펙에서 확정 | M0 · M2 |
| D10 | 개발 = 인수 개발자 + AI · 최종 결정 = 박요한 · 김도윤 = 자문(선택) | — |
| P-1 | 가격 상승: max(견적 상품가 × 5%, $3)까지 회사 흡수, 초과분만 추가 결제(동결 환율 재계산 · 동의 48h · 거절 · 무응답 = 취소 · 전액 환불) — 결제 단계 `PRICE_ADJUSTMENT` | M2 |
| P-2 | 견적 청구 무게 = 추정 × 1.2(배송비에만). 실측 ≤ 버퍼 → 추가 청구 없음 · 잔여 회사 보유 | M2 |
| P-3 | 반품 = 하자 · 오배송만, 수령 후 5영업일(한국) + 언박싱 영상, 반송비 고객 선불, 환불 = 결제액 − DDP − $10 | M3 |
| P-4 | 구매 전 무료 · 구매 후 ~ 출고 전 = 판매처 왕복 배송 · 반품비 실비 + $5 · 출고 후 취소 불가 | M3 |
| P-6 | 자동 승인 예외: 결제 총액 > $300 · 동일 상품 > 5 · 위험물 · 금지 의심 · 차단 사용자 | M3 |
| P-8 | 초기 할인 = Shopify 할인(`appliedDiscount`, 정산 기준 = 할인 후 금액) | M2 |
| P-9 | 구매 전 즉시 셀프 취소 P1(행 잠금 · 즉시 환불 · `orderCancel`) | M3 |
| 검수 | 기본 = 미개봉 $0 · 디테일 검수 $7/판매처 P1 · **결과 항상 고객 확정(D-a, 72h 무응답 = 확정)** · 이상 시 그대로 발송 / 판매처 교환 / 환불 | M3 |
| 관세 초과 | 고객 부담(약관대로). 증빙과 함께 추가 결제 요청(`TAX_OVERAGE`, 7일), 미납 시 계정 차단. "No extra charges at the border" 무조건 문구 금지 | M2 · M3 |
| 수익원 | 배송 마크업 · 환율 마진 · 영세율 환급 · 최저가 결제 차익 — 4종 모두 MVP. **마크업 10% · 환율 마진 0.5% 확정**(설정값) | M2 · M4 |
| D3 | 현행 유지 — 커밋 작성자 `paynshipcompany` + pre-commit 훅, main 교체 때 새 main 에 훅 재설치 | M0 직후 |

**추가 확정 (261007 오후)** — 원문 = 변경 시트 §1.0, 약관 반영 = 약관 개정안 목록 §3. 일정: M3 11/23~12/24 · M4 12/28~2027-01-29 · **첫 실매출 2027-01 말(G0 후 약 16주)**.

| 결정 | 내용 | 단계 |
|---|---|---|
| D-g 합포장 | **MVP 포함.** 결제 완료 · 출고 전 주문을 한 상자로(고객 요청). 고객 이익일 때만 — 미리보기에서 배송비가 늘면 요청 불가, 승인 단계 실측에서 늘면 미승인 → 개별 출고. 줄어든 차액은 출고 때 부분 환불. 관세 재계산 `[관세사 확인]`. 요구 27.0 · FR-C-048 · FR-O-049 · FR-B-019 | M3(+1주) |
| D-a · D-b | 디테일 검수 결과는 항상 고객 확정 → 출고 후 문제는 일반 하자 반품 규칙. 검수 환불 시 판매처 반품비는 교섭, 안 되면 실비 고객 차감 | M3 |
| D-c | 창고 안 분실 · 파손(회사 과실) = 결제액 전액(환불 또는 재구매 발송, 고객 선택) | M3 |
| D-d · D-e | 수수료율 공개 · 구매 완료 약속 1~3영업일(내부 12h) | M2 |
| D-f | 장기 보류 건 보관 45일 무료 → 하루 $1 → 75일 후 폐기(처리기 FR-B-063) | M3 |
| D-h · D-i | 클레임 증빙 보관 = 종결 후 1년 · DPO = 박요한 | M3 · 외부 |
| D-j · D-k | 금지품목 폐기 = 폐기 실비 차감 후 환불 · 반품 환불 기준액 = 1차 + 예외 결제 합계(관세 초과 납부분은 DDP 세금에 포함) | M3 |

**아직 열려 있는 것** — P-5 네이버 쇼핑 API 사용 가능 여부(박요한 확인) · 법인 등기 여부 · 사업자 유형 `[확인 필요]`(DPO 는 박요한으로 확정, D-i) · `[미조사]` 3건(Shopify 비배송 품목 fulfillment — **M2 블로커**, Shopify 주문 편집으로 예외 결제 붙이기, Draft 인보이스에서 할인 코드 직접 입력) · 합포장 관세 신고 단위(관세사) · 약관 법무 회신(약관 개정안 목록 §4).

---

## 9. 지켜야 할 것

- **`main` 은 운영이다**(D2 교체 전까지). push = Vercel 운영 배포. 실험은 `rebuild` 또는 기능 브랜치에서.
- **커밋 작성자**: 이 레포는 Vercel Hobby 팀 설정 때문에 작성자가 `paynshipcompany <277602128+paynshipcompany@users.noreply.github.com>` 여야 배포가 된다. `bash scripts/git-hooks/install.sh` 로 훅을 설치하면 검사해 준다(main 브랜치 기준 파일). `rebuild` 브랜치 작업도 같은 작성자로 커밋하는 것을 권한다(프리뷰 배포).
- **시크릿 금지**: `.env*` 커밋 금지(훅이 막는다). 원격 주소에 토큰을 넣지 않는다.
- **결제 · 개인정보 · 약관 · 광고 문구**를 바꾸면 법무 검토를 거친다. 약관은 변호사 검토 전 외부 게시 금지. 화면 · 카피에 "No extra charges at the border" 같은 무조건 약속을 쓰지 않는다(대체 문구는 약관 개정안 목록 §2).
- **B 의 상태 기계를 우회하지 않는다.** A · A' 의 운영 화면을 옮길 때는 화면만 가져오고 로직은 B 서비스에 연결한다(A · A' 라우트에는 감사로그 · 상태 검사가 없다).

---

## 10. 연락

- **최종 결정** · 제품 · 정책 · 외부 계약(결제 · 특송 · 관세사 · 세무사 · 변호사): **박요한**
- B 아키텍처 자문(선택): 김도윤 (GitHub `maybedy`)
- 계정 · 키 · Vercel · Shopify 접근 · push 권한: 박요한에게 요청
