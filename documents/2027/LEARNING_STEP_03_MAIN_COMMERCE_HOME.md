# Step 3 — 실제 첫 화면과 고객 여정 변경

2026-11-23 시작 · 2026-11-24 탭 역할 갱신 · 저장소 구현, production 배포 아님

## 왜 다시 작업했나?

Step 2는 합배송 알고리즘과 `/dev/consolidation` 시안만 바꿨다. 사용자가 평소 여는 홈에는 New request / My requests가 그대로였다. 구현 방향서의 주요 고객 화면을 바꾸지 않은 범위 선정 문제였다.

## 이전 → 이후

| 이전 | 이후 |
| --- | --- |
| Products / New request / My requests / Delivery details | Paste a Link / Discover Korea / How It Works(배송·반품·FAQ 통합); 로그인 시 Orders + 주의 필요 건수, Account에서 배송정보 |
| 기존 3D 웰컴 장면과 URL 중심 | 기존 화면 디자인·큰 3D·일러스트 디테일을 유지하며 Paste a Link에 고객 URL/배송국가 집중 |
| 홈과 별도 탭에 중복된 MD/URL 역할 | Discover Korea에 MD 검색·카테고리·목적국 집중, URL 입력/URL 시작 유도 제거, 같은 구매 검토로 연결 |
| 로그인해도 같은 홈 | 본인 활성 주문/견적 우선, holds/quote actions 먼저, 이벤트 시각/미확정 ETA |
| 배송/반품 설명을 찾기 어려움 | 내비게이션·footer에서 가이드 접근, 미구현 정책/자동 환불은 명확히 안내 |
| 다른 SVG가 먼저 뜨고 잠시 후 3D로 바뀜 | 실제 3D 장면을 캡처한 약 35 KB WebP를 먼저 표시하고 첫 WebGL frame 후 250ms 전환; 실패 시 같은 poster 유지 |

## 핵심 파일

1. `components/home/HomeExperience.tsx`: 고객 URL/목적국과 기존 parcel welcome.
2. `features/storefront/products/ProductCatalog.tsx`, `useProductDraft.ts`: Discover Korea에서 상품/수량/옵션/배송국가를 공통 구매 폼에 전달.
3. `lib/purchases/home-orders.ts`: 인증된 owner로 제한한 조회·집계, 사적 필드 제외, 최대 세 개 요약.
4. `components/home/HomeOrdersProvider.tsx`, `OrdersOverview.tsx`: 로그인 상태와 응답 계정 일치 검사, 오류/빈 결과 구분, 실제 기록 표시.
5. `components/site/SiteHeader.tsx`: 세 역할의 내비게이션과 계정 메뉴.
6. `components/guides/HowItWorksGuide.tsx`: 일러스트 구매 과정 + 비용/배송/반품/FAQ. `/guides/shipping-and-returns`는 새 가이드의 배송 항목으로 307 redirect.

서버는 브라우저가 보내는 사용자 ID를 신뢰하지 않는다. 기존 `/api/purchases?view=home`에서 `purchaseUser()`의 ID만 사용한다. summary의 상태는 DB 기록이며 새 배송 이벤트를 생성하지 않는다. 출고 날짜나 도착 날짜를 추정하지 않는다. 이력·PII·결제/운송사 서명 경로는 변경하지 않는다.

## 테스트와 학습

- RED: 새로운 navigation 기대값 두 개가 기존 header에서 실패; home-order service import가 없어서 suite 실패.
- RED: catalog 이름/브랜드 검색 기대값 한 개가 기존 검색 없는 pagination에서 실패.
- RED: 초기 HTML의 실제 studio poster와 context-loss 복원 기대값 두 개가 기존 SVG에서 실패. GREEN: poster 선로딩·첫 렌더 후 표시·실패 복원 테스트 통과.
- GREEN: nav, server scope/DTO/만료 quote, guest no-fetch, account switch/late-response/sign-out, 빈 결과/실패 구별, 검색/pagination 테스트 통과.
- 이후 browser 통합으로 실제 guest 제품 선택/URL + destination handoff, desktop/mobile, 서비스 가이드를 검증한다.
- 리팩터링: 상품 draft 생성은 shared hook으로 추출; DB read/DTO와 React 로딩/화면 책임을 분리.

용어: **projection**은 홈에 필요한 필드만 고르는 것, **owner scope**는 본인 계정 조건, **stale response**는 계정이 바뀐 후 도착한 옛 응답이다.

## 사용자가 요청한 화면 디자인 복원 (2026-11-23)

첫 Step 3 시안은 밝은 흰색/짙은 주황으로 전역 팔레트·글자·간격·작은 3D·카드 스타일을 한꺼번에 바꿨다. 사용자는 UX 방향은 동의하되 화면의 기존 세계관/디테일이 더 좋다고 명확히 수정했다. 따라서 `HomeExperience`의 기존 hero·크기·일러스트 과정·FAQ와 전역 cream/blue/coral 스타일을 복원했다. 상품 이미지와 3D 모델을 롤백한 것이 아니다. 35 KB studio poster·사용자 소유 주문 요약·MD 검색·배송국가 전달은 유지한다. 첫 nav와 기본 홈은 Paste a Link, 두 번째는 Discover Korea다. 이 요청이 앞선 전역 white/orange 적용보다 우선하며, 별도 합배송 preview는 흰색/주황을 유지한다.

## `/icon.svg`와 `/_app` 오류 대응

사용자가 보낸 두 query 형태를 3000/3002에서 조회한 시점에는 모두 HTTP 200 SVG여서 원래 오류는 재현하지 못했다. 3000은 별도 `paynship-v2` checkout, 이 앱은 3002다. 다른 checkout은 변경하지 않았다.

소스 `next dev`와 `next build`가 같은 `.next`를 사용하던 충돌 가능성을 제거했다. `next.config.ts`는 development phase에 `.next-dev`, build/start에는 `.next`를 선택한다. [Next.js distDir](https://nextjs.org/docs/app/api-reference/config/next-config-js/distDir)와 [phase 설정](https://nextjs.org/docs/pages/api-reference/config/next-config-js#phase)에 따른 분리다. 이는 원래 오류의 원인을 확정한 주장이 아니다. preview startup도 홈/JS뿐 아니라 `/icon.svg`의 성공 상태·SVG MIME/body를 확인하고 manifest 오류에는 재시도한다. 데이터나 이미지 파일을 삭제하지 않는다.

RED: 기존 nav 순서/링크, 동일 build directory, icon 오류 중 잘못된 ready 선언을 검출. GREEN: phase 선택과 icon 재시도 테스트 통과. 실제 동시 build/dev 검증과 최신 browser 결과는 아래에 기록한다.

실습: Discover Korea에서 ICONIC을 검색하고 Japan을 고른 다음 상품을 선택한다. `/purchase`에서 같은 seller URL과 JP가 유지되는지 확인한다. 홈으로 돌아와 China + URL로 진행하면 CN이 전달된다. 로그인 전에는 private purchase API가 호출되지 않는다.

```bash
npm start app
# http://127.0.0.1:3002/
# 기존 snapshot은 소스 편집 후 이 명령으로 갱신
npx vitest run components/home/__tests__/home-orders.test.tsx components/site/__tests__/navigation.test.tsx lib/purchases/__tests__/home-orders.test.ts features/storefront/catalog/__tests__/pagination.test.ts
npx playwright test --config scripts/ci/consolidation.playwright.config.ts
```

가상 sample app은 실제 로그인/주문을 제공하지 않는다. 로그인 주문 홈은 테스트 fixture로 분기 검증하고 실제 계정/DB 연결은 별도 운영 설정이 필요하다.

## 남아 있는 요구사항

실제 상품 원산지·정확한 SKU/세번·국별 규정/운임을 공급하는 전체 compiler, 승인된 국별 Golden Vector, 번역/통화 전환, live 합배송/입고 DB/동의/다중박스 추적/환불은 여전히 미완료다. 새 탭 이름이나 새 가이드가 이를 구현 완료로 바꾸지 않는다. 3D poster는 시각 연속성을 개선하며 GPU/네트워크 로딩시간 벤치마크는 수행하지 않았다.

## 3D 로딩을 다르게 보이게 하는 원인과 변경

기존 `ParcelWorld`는 client effect에서 Three.js를 동적으로 가져온 뒤 첫 렌더까지 별개의 SVG를 표시했다. 모듈 다운로드·개발서버 컴파일·WebGL 초기화·shader 비용 모두 첫 프레임 지연에 영향을 줄 수 있으며 특정 GPU만 원인이라고 단정하지 않는다.

실제 자체 geometry를 `scripts/preview/capture-parcel-poster.mjs`로 캡처하여 투명 배경 WebP로 보관한다. `next/image` priority + unoptimized로 작은 정적 이미지를 바로 가져오고 첫 성공 frame에서 crossfade한다. reduced motion은 전환하지 않는다. 초기 HTML에 poster가 있어 JS 없이도 장면의 입체감이 보이지만, 그때는 정적 이미지다. WebGL 사용 불가/손실에는 같은 poster로 복귀한다. 모델·색상·카메라 변경 시 재캡처해야 한다. 기존 원본 PNG 2개를 대체하지 않는다.

## 초기 Step 3 검증 (화면 복원 전 기록)

- `npm run test:ci`: **75개 파일 · 706개 통과**. auth/session owner 고정, 다른 userId 무시, guest DB 미접근, 응답 no-store, private-field projection, 계정 전환 후 늦은 응답 차단 포함.
- `npm run build`, `npm run type-check`, `npm run docs:check`, `npm run lint`, `git diff --check`: **통과**. lint에는 기존 `lib/admin/cache.ts`의 unused eslint-disable 경고 1개가 있다.
- `npm run app:test`: **6개 통과**. `npm run samples:workspace:test`: **10개 통과**. `npm run product:evidence:test`: **18개 통과**. launcher 검사는 sandbox에서 처음 실패했으며 local socket/subprocess 허용 후 실행 성공했다.
- `npx playwright test --config scripts/ci/consolidation.playwright.config.ts`: **Chromium desktop/mobile 12개 통과**. MD/URL 목적국 전달, 검색 bookmark, 안내 접근, JS 없는 poster, 합배송 계산과 외부 host 차단 검증. CI workflow에도 이 설정을 추가했다; hosted CI 자체는 NOT RUN.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 PLAYWRIGHT_DISABLE_WEBSERVER=true npx playwright test e2e/public-journey.spec.ts --workers=1 --reporter=line`: 최종 Playwright report **19개 통과 (2.6분)**, `.last-run.json`은 `passed`, 실패 목록 없음. reduced motion·실제 WebGL·context loss·WebGL 비활성·pointer 정지·375~1440px·social/가격/기존 상품·sample workspace 포함. 명령 실행 도구는 보고서 완료 후 종료 코드 143을 반환했으므로 명령 종료 코드와 assertion 결과를 구분한다.
- 초기 browser 실행의 whitespace selector를 실제 accessible name에 맞췄다. cold dev route 컴파일에는 20초 expectation을 두었고, 여러 페이지 이동/스크린샷을 한 테스트로 묶어 mobile 60초가 초과된 경우 독립 MD/URL 시나리오로 나눴다. 단언은 유지했고 분리 후 desktop/mobile 모두 통과했다. 동시 browser 실행은 자원·trace 디렉터리 충돌을 일으켜 이후 순차 실행했다.
- `npm run ops:check`: **실패, production 준비 미완료**. 앱 URL·PII 키·Redis·결제/배송 webhook·operator 설정 누락, DB URL 형식 오류. 자격증명 값을 출력하거나 설정을 변경하지 않았다.
- 실제 로그인/DB·운송사/결제·통관 Golden Vector·PostgreSQL smoke·ZAP·production 배포: **NOT RUN**.
- `npm start app`: 갱신 완료, 기존 fictional SQLite 수정 보존, 실제 환경 파일/제공자 자격증명 제외. `http://127.0.0.1:3002/`에서 새 홈을 확인한다.
- 원본 PNG Git blob은 각각 `e570446abbeacd17abf0beb9fea468281fee4a7d`, `cf22ed00c8bb7b5d2fbda650f6881f5ca7d4396c`로 변경 없음.

## 화면 복원·icon 수정 후 검증

- Vitest: **76개 파일 / 707개 통과**. phase별 output 디렉터리 분리와 Paste a Link 우선 nav를 포함한다.
- launcher/readiness: **7개 통과**. icon 500을 재시도하고 SVG가 정상일 때만 startup 완료한다.
- **동일 checkout에서 dev server를 켠 채 production build 실행 통과**: 3103의 두 icon query 형태에 총 **98번 HTTP 200 SVG**, `.next-dev/build-manifest.json` hash 불변, `.next/BUILD_ID` 생성 확인. 이 임시 검증 서버는 종료했다.
- build/type-check/docs-check/diff-check 통과. build lint는 기존 unused directive 경고 1개만 있다.
- restored Chromium desktop/mobile **14개 통과**: URL 우선 홈·MD handoff·guide·검색·JS 없는 3D poster·두 icon query·합배송 preview gate/계산.
- 복원 후 기존 `public-journey.spec.ts` **19개 통과 (3.3분, 종료 코드 0)**. 기존 palette·375~1440px·WebGL 실패/복원/reduced motion/pointer·계정/비용·상품·sample workspace 회귀 포함. 총 browser **33개 통과**다.
- 최종 `npm start app` snapshot 갱신 및 icon readiness 통과; 사용자 앱은 `http://127.0.0.1:3002/`다. 임시 3102/3103 검증 서버는 종료했고 별도 3000 checkout은 변경하지 않았다.

복원 후 실제 browser 화면: [desktop](assets/screenshots/main-commerce-home-desktop.png) · [mobile](assets/screenshots/main-commerce-home-mobile.png). CSS pixel 크기로 저장한다. 새 screenshot은 원본 승인 PNG와 별도 파일이다.


## 사용자 탭 역할 분리 — 2026-11-24

기대 결과: 첫 탭은 내 상품 링크를 붙여넣고 PayNShip의 원래 parcel world를 경험한다. 두 번째 탭은 MD 상품만 탐색·선택한다. 세 번째 탭에서 구매 과정과 배송/반품 안내를 한 번에 찾는다.

| 탭 | 현재 역할 |
| --- | --- |
| Paste a Link (`/`) | 고객 URL + 목적국, 기존 큰 3D welcome, 수수료/안심 안내, 로그인 시 소유 주문 요약 |
| Discover Korea (`/products`) | MD 상품·검색·카테고리·목적국. URL 입력과 “Start with a product link” 유도 제거. 상품 선택 후 공통 구매 검토 폼에 seller URL/옵션/국가 유지 |
| How It Works (`/guides/how-it-works`) | 기존 일러스트 과정·비용·배송·반품·FAQ 통합. 이전 배송/반품 URL은 배송 항목으로 이동 |

- RED: 세 탭/홈 역할/MD 역할 검사에서 **3개 실패, 1개 통과** 확인 후 구현했다.
- GREEN: 홈에서 MD와 긴 가이드를 분리하고, 세 번째 탭의 독립 guide 컴포넌트를 만들고, 카탈로그의 URL 유도를 제거했다. 목적국 선택은 MD에도 유지한다.
- REFACTOR: 미사용 홈 MD 컴포넌트/CSS를 제거하고 FAQ CSS를 guide 소유로 옮겼다. guide를 직접 열어도 정상 스타일을 갖는다. 기존 일러스트·상품 사진·3D geometry와 원본 PNG 두 개는 변경하지 않았다.
- 학습: 역할 구분은 탭 이름만 바꾸는 일이 아니다. 해당 화면에서 할 일, 다음 화면으로 가져갈 값, 기존 북마크의 이동까지 함께 검증해야 한다.

이전 섹션의 검증 수치는 각 당시 코드에 대한 이력이다.

현재 탭 역할 검증:

- `npm run test:ci`: **77개 파일 / 710개 통과**, 인증/소유권/정책 회귀 포함.
- `npm run build`, `npm run type-check`, `npm run docs:check`, `npm run lint`, `git diff --check`: **통과**. lint는 기존 `lib/admin/cache.ts` unused directive 경고 1개다.
- 세 탭 + 합배송 preview Playwright: **18개 assertion 시나리오 통과 (desktop/mobile, 3.5분)**. 두 icon query 200, guest private API 미호출, URL/MD 목적국 전달, 상품 검색, guide/307 redirect, JS 없는 poster, 가로 overflow 검사를 포함한다. `.last-run.json`은 `passed`, 실패 목록 없음. 실행 도구는 보고서 완료 후 종료 코드 143을 반환했으므로 assertion 결과와 명령 종료 상태를 구분한다.
- 기존 `e2e/public-journey.spec.ts`: **19개 통과 (3.5분, 종료 코드 0)**. 375/768/1024/1440px, 기존 색상/공통 shell, WebGL/reduced motion/context loss, MD 링크/사진/페이지/키보드, guest API 보호, 계정/비용, fictional workspace 회귀 포함. 앞의 18개와 합쳐 **37개 browser 시나리오 통과**다.
- `PAYNSHIP_NO_OPEN=1 npm start app`: **종료 코드 0**, 3002 snapshot 갱신, 15개 browser script/readiness 통과, 기존 fictional SQLite 수정 보존.
- 승인된 원본 PNG 두 개의 Git blob은 앞서 기록한 값과 동일하다. 새 screenshot은 별도 경로에 저장했다.
- 실제 운영 DB/결제/운송사/법규 Golden Vector, hosted CI, PostgreSQL smoke, ZAP, production 배포: **NOT RUN**. 이번 변경은 공개 화면 역할 분리이며 운영 준비 완료를 의미하지 않는다.

실제 브라우저에서 확인한 현재 화면:

| 탭 | Desktop | Mobile |
| --- | --- | --- |
| Paste a Link | [화면](assets/screenshots/tabs-paste-link-desktop.png) | [화면](assets/screenshots/tabs-paste-link-mobile.png) |
| Discover Korea | [화면](assets/screenshots/tabs-discover-desktop.png) | [화면](assets/screenshots/tabs-discover-mobile.png) |
| How It Works | [화면](assets/screenshots/tabs-guide-desktop.png) | [화면](assets/screenshots/tabs-guide-mobile.png) |
