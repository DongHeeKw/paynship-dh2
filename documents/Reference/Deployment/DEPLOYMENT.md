# 로컬 실행·배포

변경일: 2026-10-12. 현재 Windows는 로컬 개발 환경입니다. 다른 Linux 서버의 도메인·DNS·clone·DB·TLS·systemd 출시는 [Linux 출시 실행서](LINUX_RELEASE.md)를 따릅니다. 이 작업에서는 원격 서버 배포·DB 변경을 실행하지 않았습니다.

## 화면 실행

Node.js 24 LTS에서 다음을 실행합니다. Next.js 앱만 실행하며 Docker·AI 키·스크래퍼 worker는 필요하지 않습니다.

```powershell
npm.cmd install
npm.cmd run dev
```

[http://localhost:3000](http://localhost:3000)을 엽니다. 로그인 전에 URL·도착국의 초기 확인과 구매 절차를 안내하며, 이 공개 화면에는 DB와 Supabase Auth 프로젝트 설정이 필요하지 않습니다. 실제 API 데이터에는 Supabase/Auth·DB·새 테이블과 암호화 키가 필요합니다.

## 로그인 설정 없이 고객 화면 확인

Google OAuth를 준비하지 않고 화면을 확인하려면 현재 개발 서버를 `Ctrl+C`로 종료하고 같은 PowerShell에서 실행합니다. 실제 `.env`를 바꾸지 않아도 됩니다.

```powershell
$env:PAYNSHIP_DEV_PREVIEW = '1'
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

[http://localhost:3000/dev/preview](http://localhost:3000/dev/preview)을 엽니다. 가상 고객으로 URL·도착국·배송 입력·요청 목록·상세·문의 화면을 확인할 수 있습니다. 먼저 홈이나 `/purchase`에서 입력한 유효한 같은 탭 상품 초안은 마운트 후 한 번 읽어 복원하며, 없으면 빈 입력으로 시작합니다. Yes24 예제는 직접 선택할 때만 입력됩니다. 원래 공개 초안을 수정·삭제하지 않고 이후 편집은 메모리에만 저장합니다. 화면 이동 중 편집 값을 유지하고 새로고침하면 변경·생성 주문·문의가 초기화되어 원래 공개 초안을 다시 읽습니다. 샘플 2개를 포함해 최대 요청 20개·요청당 미해결 문의 3개를 제한하고 가상 배송 예시는 `SAMPLE_ONLY`로 표시합니다. 실제 고객 주소·통관 식별번호를 넣지 않습니다. DB·외부 결제·발주·배송 연결과 인증 세션 발급은 수행하지 않습니다. 진입·종료는 전체 페이지 이동을 사용합니다.

상품 확인 영역은 URL에서 파싱한 판매처·판매점 식별자·상품 번호·정규 주소와 날짜가 있는 기존 수집 결과를 구분합니다. Naver Brand 예제 `kinox/products/5912828061`은 robots 정책에 막힌 수집 기록이므로 상품명·가격·통관 정보는 표시할 수 없습니다. URL을 입력하는 동작이 상품 페이지 실시간 수집을 뜻하지는 않습니다.

서버가 development 모드이고 `PAYNSHIP_DEV_PREVIEW=1`이며 요청 host가 localhost/loopback일 때만 사용할 수 있습니다. production은 플래그와 관계없이 404입니다. 로컬 서버를 위처럼 127.0.0.1에 바인딩하고 외부 터널·프록시로 공유하지 않습니다. `/dev-login`을 다시 활성화하거나 실제 API의 인증을 생략하지 않습니다.

미리보기를 끄려면 서버를 종료한 뒤 현재 PowerShell의 변수를 제거하고 다시 실행합니다.

```powershell
Remove-Item Env:PAYNSHIP_DEV_PREVIEW -ErrorAction SilentlyContinue
npm.cmd run dev
```

`.env` 또는 `.env.local`에 플래그를 직접 설정했다면 해당 값도 `0`으로 변경해야 합니다. 이 플래그는 서버 전용이며 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 실제 로그인 화면은 현재 Google을 사용합니다. 실데이터 시험에는 Supabase 인증 세션·DB·암호화 키 설정이 필요합니다.

## 환경

`.env.example`을 기준으로 `.env` 또는 `.env.local`에 입력합니다. 실제 비밀번호·키는 커밋하지 않습니다.

| 변수 | 요구 |
| --- | --- |
| `DATABASE_URL` | 앱 PostgreSQL 연결 |
| `DIRECT_URL` | 제한된 런타임 DB 연결; production migration 관리자 연결은 별도 libpq 파일 |
| `NEXT_PUBLIC_APP_URL` | 정확한 앱 origin, 로컬은 `http://localhost:3000` |
| `PAYNSHIP_DEV_PREVIEW` | 선택 사항, development·loopback에서 `1`일 때만 가상 UI; 서버 전용 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth 프로젝트 |
| `PII_ENCRYPTION_KEY` | 64자리 hex, 서버 전용·안전한 보관과 백업 |
| `ADMIN_SUPER_ADMINS`, `ADMIN_OPERATORS`, `ADMIN_VIEWERS` | DB isAdmin 계정의 이메일 또는 ID, CSV |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | production에서 필수 |
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET` | 결제 기능에 필수, 서버 전용 |
| `SHOPIFY_API_VERSION` | 현재 결제 구현의 pinned 버전 `2026-07` |
| `SHIPPING_WEBHOOK_SECRET` | 실제 배송사 gateway와 공유하는 서버 비밀 |

새 암호화 키를 발급했다면 기존 암호문은 이전 키 없이는 읽을 수 없습니다. 이미 저장한 고객정보가 있는 환경의 키를 임의로 교체하지 않습니다.

Supabase Auth의 Site URL과 허용 redirect에 localhost·배포 origin을 설정하고 사용할 이메일/OAuth 제공자를 구성합니다. 서버 DB 계정은 신뢰된 앱 역할이고 browser anon/authenticated 역할에는 앱 테이블 권한을 주지 않습니다.

## DB SQL 적용

신규 SQL: [2026-10-11-purchase-flow.sql](../../../prisma/sql/2026-10-11-purchase-flow.sql). 원격 DB 변경은 이 작업에서 자동 실행하지 않습니다.

백업과 현재 스키마를 확인한 뒤 SQL을 검토하고 관리자가 적용합니다. SQL은 새 6개 테이블과 인덱스·제약·RLS를 만들고 기존 앱 테이블의 browser role 권한도 차단합니다. 기존 인증 trigger와 실제 server DB role의 권한을 함께 확인하세요.

`prisma db push`만 실행하면 SQL의 RLS·권한 차단이 적용되지 않습니다. 적용 여부는 실제 DB에서 확인해야 합니다. 첫 적용용 SQL이므로 이미 적용한 DB에 무조건 재실행하지 않습니다.

런타임 `.env`의 제한된 앱 계정으로 DDL을 실행하지 않습니다. 관리자에게 별도로 제공한 migration 연결 또는 Supabase SQL editor에서 검토한 SQL을 적용합니다. Linux에서는 출시 실행서의 libpq service·checksum ledger 실행기를 사용합니다. URL·키를 CLI 인자나 화면 출력에 노출하지 않습니다. 적용 뒤 로컬에서는 `npm.cmd run db:generate`로 client만 생성합니다.

DB 대상이 원격이면 SQL 적용도 원격 변경입니다. 적용 후 새 요청을 생성하고 다른 계정의 요청 조회·직접 REST 접근이 차단되는지 확인합니다.

## 검증·출시

```powershell
npm.cmd run type-check
npm.cmd run test:ci
npm.cmd run build
npm.cmd run docs:check
npm.cmd run ops:check -- development
```

production 환경 점검은 `npm.cmd run ops:check -- production`입니다. 실제 비밀값을 출력하지 않습니다.

`npm.cmd run predeploy:check`는 type-check·docs·unit tests·오프라인 상품 증거 테스트·build를 순서대로 실행합니다. GitHub CI는 임시 PostgreSQL 16에 검증된 과거 baseline과 신규 SQL을 적용하고, [DB smoke](../../../scripts/security/db-smoke.sql)로 RLS·브라우저 차단·런타임 최소 권한을 검사합니다. CI용 합성 데이터는 transaction rollback하며 실제 고객 DB에 이 테스트를 실행하지 않습니다. 실제 CI 통과 여부는 해당 commit의 Actions 결과로 확인합니다.

- production은 Redis가 없거나 요청 제한기가 실패하면 일반 API를 503으로 차단합니다.
- TLS·CSP·CSRF·신뢰 프록시 IP·WAF와 배포된 보안 헤더를 확인합니다.
- Shopify orders/paid를 `/api/webhooks/purchases`에 등록하고 서명·금액·중복·만료·timeout을 시험합니다.
- 실제 배송 adapter를 `/api/webhooks/shipping`에 연결하고 재전송·역순·예외 이벤트를 시험합니다.
- 나라·품목별 관세 근거, 창고 계약, 환불·정산, 개인정보 보존·삭제·키 복구를 완료합니다.
- ZAP의 비로그인 검사와 인증된 계정·운영자 API 검사, 실제 DB 동시 요청 시험은 별도입니다.

[운영](../OPERATIONS.md) · [보안](../SECURITY.md) · [기능 상태](../../Features/STATUS.md)
