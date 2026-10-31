# 보안 검사 실행 기록

실행일: 2026-10-12. Windows 개발 PC의 localhost 운영 빌드를 검사했습니다. 다른 Linux 서버 배포와 실제 고객 DB 변경은 실행하지 않았습니다.

아래 최초 검사와 ZAP 기록은 `4c9874ba0ee0323f406e9786434ecde0cee1f01d`의 구매 흐름 기준입니다. 이후 로그인 전 준비·개발 미리보기의 검사는 별도 항목에 기록합니다.

## 소스와 브라우저

| 검사 | 실행 결과 |
| --- | --- |
| `npm run test:ci` | 25개 파일, 173개 검사 통과 |
| `npm run product:evidence:test` | 실제 페이지를 다시 요청하지 않는 8개 수집 경계 검사 통과 |
| `npm run type-check`, `npm run build` | 타입과 마지막 UI·CSP 변경을 포함한 Next.js 15.5.27 운영 빌드 통과 |
| `npm audit --omit=dev --audit-level=moderate` | 운영 의존성 취약점 0건 |
| 실제 Chrome·Playwright | 1440px/390px에서 홈·로그인·구매·요청·배송정보 10개 화면 확인; 가로 넘침·JS/CSP 오류 없음 |
| URL 입력·로그인 | HTTP 상품 URL 거절, HTTPS 상품 URL 로그인 이동·sessionStorage 보존 확인 |
| SQLite 재생성 | 상품 증거 5개, 가상 고객·요청 각 3개, 가상 배송·CS 각 1개; 운영 DB 접속 없음 |

운영 의존성 감사와 개발 도구 감사를 구분합니다. 개발 도구 감사에는 13건이 남아 있으며 위험한 자동 major 업그레이드를 적용하지 않았습니다. 버전 변경 시 lockfile과 검사 기록을 함께 갱신합니다.

## 로그인 전 준비·개발 미리보기 추가 검사

실행일: 2026-10-12. `npm run test:ci`는 29개 파일·209개 검사, `npm run type-check`와 `npm run docs:check`는 통과했습니다. 새 검사는 공개 초안의 크기·만료·필드 제한, 정확한 상품 샘플 일치, 개발 모드·loopback gate, 외부 API fallback 차단, 미리보기 데이터 분리·중복 요청·검증 결과 위조 거절을 포함합니다.

실제 Chrome·Playwright 1440px/390px에서 URL → 상품·국가 안내 → 저장 시 로그인, 수량·옵션·국가의 초안 복원을 확인했습니다. 미리보기에서는 배송정보 변경 → 요청 생성 → CS 제출 → 취소와 `SAMPLE_ONLY` 배송 표시가 동작했습니다. 새로고침하면 요청은 최초 샘플 2개로 초기화하고, 일반 공개 초안의 sessionStorage 바이트는 변경하지 않았습니다. 미리보기 중 실제 `/api/`·Supabase Auth 요청 0건, 가로 넘침·브라우저 오류 0건입니다. 서버와 브라우저의 ICU 버전에 따른 국가명 차이는 명시적 국가명 목록으로 제거했습니다.

실제 개발 HTTP 요청에서 비로컬 Host와 `X-Forwarded-Host: localhost` 조합은 미리보기 404입니다. 클라이언트가 `x-paynship-dev-preview: 1`을 붙여도 실제 요청 목록·배송정보 API는 인증 없이 401입니다. 인증된 실데이터 동작이나 고객 DB 접속을 시험한 결과는 아닙니다. 아래 이전 ZAP 기록을 새 화면의 검사 결과로 사용하지 않습니다.

최종 `npm run build`는 타입·ESLint·운영 빌드까지 통과했습니다. `PAYNSHIP_DEV_PREVIEW=1`을 둔 실제 production 서버에서도 미리보기 기본/목록 URL은 404이고 로그인 화면에 미리보기 진입 링크가 없습니다. 위조 preview header를 포함한 실제 고객 API는 Redis 미설정 보호로 503이며, 공개 준비·로그인은 200입니다. Chrome 1440px/390px의 공개 준비 → 로그인은 CSP nonce를 포함한 운영 응답에서 JS·CSP·화면 넘침 오류 없이 동작했습니다.

## 네이버 입력 보존·미리보기 회귀 추가 검사

실행일: 2026-10-12. 미리보기의 고정 Yes24 초안이 입력을 덮어쓰는 문제를 수정했습니다. `npm run test:ci`는 32개 파일·231개 검사, `npm run type-check`는 통과했습니다. 실제 React 컴포넌트 검사는 네이버의 원본 query를 포함한 5개 입력 필드 복원 → 옵션 편집 → 배송 화면 이동 → 로컬 제출 → 다시 입력 화면 → 재마운트를 확인하며, 공개 저장소의 쓰기·삭제와 실제 fetch가 없음을 검사합니다. 만료·잘못된 공개 초안의 미리보기 읽기도 원본을 삭제하지 않습니다.

실제 Chrome 1440px localhost/390px 127.0.0.1에서 빈 미리보기 진입, 네이버 URL 직접 입력, 판매자 경로 `kinox`·상품 번호 `5912828061`·정규화 링크 표시, 요청·CS·취소, 공개 준비 → 로그인 → 미리보기의 입력 복원을 확인했습니다. Yes24 예시는 명시적으로 버튼을 누른 경우에만 나타나며, 새로고침하면 미리보기 변경은 사라지고 원래 공개 초안을 다시 읽습니다. 공개 sessionStorage 바이트 변화·실제 API/Auth 호출·hydration/JS 오류·가로 넘침은 모두 0건입니다. 현재 SSR과 브라우저의 홍콩 표기는 모두 고정 `Hong Kong`입니다.

별도 운영자 수집 한 번에서 해당 네이버 URL의 robots 응답은 200이었지만 경로 접근 정책에 따라 `robots_blocked`를 기록했습니다. 상품 페이지 자체는 요청하지 않았고 모든 상품 필드는 미확인입니다. [원본 결과](../../../data/samples/naver-product-evidence-2026-10-12.json)를 공개 화면의 해당 정규화 URL에만 연결하며, 다른 상품이나 다른 판매처의 사실을 대입하지 않습니다. 이번 수정도 공개 실시간 수집 endpoint를 추가하지 않습니다.

최종 운영 빌드와 타입·ESLint를 통과했습니다. 미리보기 플래그와 위조 header를 포함한 production 재검사에서도 미리보기 404·일반 고객 API의 Redis 미설정 보호 503·공개 화면 200을 유지했습니다. 실제 Chrome 1440px/390px의 공개 상품 정보 → 로그인과 CSP nonce 응답은 JS·CSP 오류 없이 동작했습니다. `product:evidence:test` 8개도 통과했습니다.

## ZAP 범위

[OWASP ZAP](https://www.zaproxy.org/docs/desktop/) 2.17.0 공식 cross-platform 배포본을 SHA-256 검증 후 사용했습니다. 스크립트는 [설치](../../../scripts/security/install-zap.ps1)와 [검사](../../../scripts/security/zap-scan.ps1)에 있습니다.

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/security/zap-scan.ps1 -TargetUrl http://127.0.0.1:3001 -SpiderSeconds 30
```

검사는 비로그인 GET·범위가 제한된 spider·수동 규칙 검사입니다. 주문 생성·취소·결제·CS 제출·공격형 active scan을 실행하지 않습니다. scanner API는 임의 포트의 loopback과 임의 API key를 사용하고 종료합니다. raw HTTP·HTML 보고서는 `.security-tools/` 아래 Git 제외 파일로만 보관합니다.

첫 검사에서는 53개 URL을 수집하고 수동 검사 대기 0건을 확인했습니다. 규칙 10055의 중간 위험 `CSP: Wildcard Directive` 20개 인스턴스는 불필요한 `img-src https: data: blob:` 때문이었습니다. UI는 외부 이미지를 사용하지 않으므로 `img-src 'self'`로 제한했습니다. production script/style에는 응답마다 nonce를 적용하고 실제 HTML script 태그에 같은 nonce가 있는지 확인했습니다.

최종 재검사 완료: 2026-10-12 09:17 KST, 53개 URL, 수동 검사 대기 0건. 높음·중간 위험은 0건이며 10055는 재발하지 않았습니다.

| 규칙 | 최종 위험·인스턴스 | 해석과 남은 확인 |
| --- | --- | --- |
| 10044 Big Redirect | 낮음 4개 | 비로그인 관리 화면·구형 chat의 Next.js HTML/RSC redirect 본문 크기 경고. 검사 응답에는 개인 주문·배송 데이터가 없었으나 실제 인증 계정에서도 응답 노출을 다시 확인해야 함 |
| 10027 Suspicious Comments | 정보 20개 | Next.js 응답의 주석·문자열에 대한 낮은 신뢰도 경고. 고객정보 유출을 검출했다는 뜻은 아니며 번들·로그 검토를 대체하지 않음 |
| 10109 Modern Web Application | 정보 9개 | 동적 앱 탐색 범위 안내. Ajax spider·인증된 화면은 이번 범위에 없음 |
| 10019 Content-Type Missing | 정보 3개 | 일부 redirect 응답에서 MIME header가 없음. 응답·라우팅 구성은 출시 origin에서도 재검토 |

경고를 제거하기 위해 검사 규칙을 비활성화하지 않았습니다. Chrome의 최종 빌드 화면 검사에서도 CSP·JS 오류는 없었습니다. 비로그인 수동 검사에서 높음·중간 위험이 없다는 사실은 전체 서비스 안전성이나 출시 승인이 아닙니다.

## DB와 출시 검증

[GitHub CI](../../../.github/workflows/ci.yml)는 임시 PostgreSQL 16 `paynship_ci`에서 보존 schema baseline → 새 6개 테이블 migration → 제한된 서버 역할을 적용합니다. [DB smoke SQL](../../../scripts/security/db-smoke.sql)은 명시적 임시 DB에서만 실행하고 모든 가상 fixture를 rollback합니다. 앱 정상 쓰기, 브라우저 접근 차단, 관리자 권한 위조·DDL·TRUNCATE·이벤트 삭제 거절, 수량·상태 제약을 검사합니다.

코드 commit `4c9874ba0ee0323f406e9786434ecde0cee1f01d`의 [Linux Actions 실행](https://github.com/johnjuhee/paynship-v2/actions/runs/38187616418)은 **success**로 완료됐습니다. Ubuntu 24.04·Node 24·PostgreSQL 16에서 `npm ci`, baseline SQL, migration checksum ledger 2회 적용, 실제 DB 권한 smoke, 타입·문서·173개 unit 검사·8개 evidence 검사와 production build가 모두 통과했습니다. 운영 고객 DB와 서버 배포는 이 CI 범위에 포함하지 않습니다. 이후 commit의 상태는 해당 SHA의 Actions에서 다시 확인합니다.

로컬 환경 검사는 `DATABASE_URL` 형식과 `PII_ENCRYPTION_KEY` 누락 때문에 실패했습니다. `.env`의 실제 비밀번호와 원본은 변경하지 않았습니다. 로컬 운영 모드의 일반 API는 공유 Redis 설정이 없어 503으로 차단되고, 과거 API는 410을 반환하며 liveness는 200입니다.

이 검사는 실제 고객 2계정 간 소유권·운영자 역할, 실제 DB 동시 요청·취소, 배송사·결제·환불·정산, 개인정보 복구를 증명하지 않습니다. 해당 검증과 계약을 완료하기 전 실제 고객 구매 접수를 열지 않습니다. [기능 상태](../../Features/STATUS.md)와 [Linux 출시 실행서](../Deployment/LINUX_RELEASE.md)를 따릅니다.
