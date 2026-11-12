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

`instrumentation.ts`는 production 시작 시 `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 중 하나라도 비어 있으면 앱을 시작하지 않습니다. `.env`는 해당 컴퓨터에서만 읽히며 Vercel에 자동 업로드되지 않으므로 Vercel Dashboard → Project → Settings → Environment Variables에 이 세 변수를 Production 대상으로 각각 설정한 뒤 새 deployment를 만듭니다. Vercel Preview 환경도 쓸 경우 Preview 대상에도 별도 설정합니다. 서버가 뜬 다음 production 운영 점검을 통과하려면 `npm run ops:check -- production`에서 안내하는 DB·암호화·Redis·운영자·Shopify 등 추가 설정도 필요합니다.

새 암호화 키를 발급했다면 기존 암호문은 이전 키 없이는 읽을 수 없습니다. 이미 저장한 고객정보가 있는 환경의 키를 임의로 교체하지 않습니다.

### 두 배포 환경과 Google 로그인

Vercel과 Tailscale 서버는 서로 다른 배포 환경입니다. 두 주소를 번갈아 시험할 때는 각 환경의 `NEXT_PUBLIC_APP_URL`을 그 환경에서 실제로 접속하는 origin으로 설정합니다. 이 앱은 production OAuth 복귀 주소를 이 값에서 만들기 때문에, Tailscale 서버에 Vercel 주소를 넣으면 로그인이 끝난 뒤 다른 사이트로 이동합니다.

| 환경 | `NEXT_PUBLIC_APP_URL` 예시 |
| --- | --- |
| Vercel | `https://paynship-ochre.vercel.app` |
| 기존 Tailscale 주소 | `http://100.106.125.36:3001` |
| 로컬 개발 | `http://localhost:3000` |

Tailscale 주소는 tailnet 안에서만 접근 가능하고 위 예시는 HTTP입니다. 계정 UI는 일반 HTTP IP에서 이메일·Google 입력과 동작을 막으므로 로그인에는 tailnet에서 HTTPS를 활성화하고 Tailscale Serve가 제공하는 HTTPS 도메인을 사용하세요. Google의 Web OAuth는 일반적으로 HTTPS origin을 요구하며 raw HTTP IP는 허용되지 않을 수 있습니다. HTTPS origin을 쓰기로 바꾸면 `NEXT_PUBLIC_APP_URL`, Supabase 허용 URL, Google origin에 동일한 새 origin을 반영합니다. 두 서버를 동시에 운영할 경우 각 서버에 서로 다른 환경변수를 설정하고 각각 재시작·재배포합니다. `.env` 파일을 서로 덮어쓰거나 한 서버에서 두 앱 설정을 공유하지 않습니다.

1. **Google Cloud Console**에서 Google Auth Platform 프로젝트를 선택하거나 새 프로젝트를 만듭니다. Branding에 표시할 앱 이름과 지원 이메일을 설정합니다. 테스트 단계에서는 Audience를 External로 두고 본인 Google 계정을 Test users에 추가합니다. 테스트가 끝나고 누구나 로그인해야 할 때만 공개 전환과 필요한 Google 검증을 검토합니다.
2. **Google Cloud Console → Clients**에서 OAuth client를 만들고 앱 종류로 **Web application**을 선택합니다. Authorized JavaScript origins에는 실제 HTTPS Vercel origin과, Tailscale Serve HTTPS를 쓰는 경우 그 HTTPS origin을 각각 추가합니다. localhost를 쓰는 개발 환경은 `http://localhost:3000`도 추가합니다. origin에는 경로나 callback path를 넣지 않습니다.
3. 같은 Google OAuth client의 **Authorized redirect URIs**에는 Google/Supabase 안내에 표시되는 Supabase callback 하나를 등록합니다: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`. Google의 redirect URI는 앱의 `/auth/callback` 주소가 아닙니다. Google Client ID와 Client Secret을 복사합니다.
4. **Supabase Dashboard → Authentication → Sign In / Providers → Google**에서 Google provider를 활성화하고 Client ID와 Client Secret을 입력해 저장합니다. Client Secret은 Supabase에만 입력하며 `NEXT_PUBLIC_` 변수나 저장소에 넣지 않습니다.
5. **Supabase Dashboard → Authentication → URL Configuration**에서 Site URL을 주로 사용할 정식 HTTPS 주소로 설정합니다. Additional Redirect URLs에는 실제로 시험할 정확한 callback URL을 각각 추가합니다:
   - `https://paynship-ochre.vercel.app/auth/callback`
   - `https://<tailnet-hostname>/auth/callback` (Tailscale Serve HTTPS를 준비한 경우; 일반 HTTP IP 로그인은 차단됨)
   - `http://localhost:3000/auth/callback` (로컬 시험용)
   HTTPS Tailscale Serve 주소를 준비했다면 HTTP IP 대신 `https://<tailnet-hostname>/auth/callback`을 등록합니다. Vercel preview URL을 쓸 때는 필요한 preview 도메인만 제한된 pattern으로 추가하고, 전체 URL에 대한 광범위한 wildcard는 피합니다.
6. 두 앱 환경에 올바른 `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 각각 설정되어 있는지 확인하고 해당 서버를 재배포하거나 재시작합니다. 공개 anon/publishable key는 앱에 쓰지만 `service_role` key와 DB 암호는 브라우저 환경변수로 절대 노출하지 않습니다.
7. 각 HTTPS 주소에서 `/signup`의 이메일 가입·확인 메일·`/login`의 이메일 로그인과 **Continue with Google**을 각각 시험합니다. 동의 화면에서 본인 테스트 계정을 선택한 뒤 같은 주소의 앱으로 돌아오고 로그인 상태가 보이는지 확인합니다. callback으로 돌아왔는데 교환이 실패하면 로그인 화면이 오류와 제공자/redirect 설정 확인 안내를 표시합니다. 실패하면 주소창·Google/Supabase 오류 문구, Supabase Auth Logs, Vercel Function Logs 또는 Tailscale 서버 로그를 확인합니다. 로그인 redirect URI 불일치는 보통 Google Client의 Supabase callback 누락, origin 불일치는 Google Authorized JavaScript origins 누락, 로그인 후 잘못된 호스트로 이동하는 증상은 해당 서버의 `NEXT_PUBLIC_APP_URL` 불일치입니다.

추가 provider는 고객 분포와 실제 전환 근거가 있을 때 하나씩 시험합니다. Kakao는 지원되지만 유효한 이메일이 필요한 서비스 흐름에 맞춰 Kakao 이메일 scope·동의와 Supabase 설정을 검증해야 합니다. GitHub는 개발자 계정에 편중되어 일반 글로벌 구매자 인증에는 기본 선택으로 권하지 않습니다. Naver는 Supabase의 현재 내장 social provider가 아니므로 표준 `signInWithOAuth({ provider })` 목록에 임의로 추가하지 않습니다. 별도 provider 통합을 검토하기 전에는 로그인 버튼을 표시하지 않습니다. Supabase가 기본 제공하는 [social login provider](https://supabase.com/docs/guides/auth/social-login)와 [Kakao 설정](https://supabase.com/docs/guides/auth/social-login/auth-kakao)을 참고합니다.

Supabase Auth와 앱 PostgreSQL은 서로 다른 확인 대상입니다. Auth health `HTTP 200`은 Supabase Auth endpoint에 도달했다는 뜻일 뿐, DB 연결·스키마·로그인 사용자의 앱 `users` 행을 증명하지 않습니다. 이 프로젝트는 Google 로그인 시 Supabase Auth 사용자를 만들고, 앱 DB의 `users` 행은 배송 프로필 저장 등 DB 작업을 처음 수행할 때 생성합니다. 따라서 로그인만 한 직후 `public.users` 행이 없는 것은 예상된 동작입니다.

DB를 실제로 확인할 때는 먼저 Supabase Dashboard → **SQL Editor**에서 읽기 전용 쿼리만 실행합니다:

```sql
select current_database() as database_name, current_user as database_role, now() as checked_at;
select to_regclass('public.users') as users_table,
       to_regclass('public.delivery_profiles') as delivery_profiles_table,
       to_regclass('public.purchase_requests') as purchase_requests_table;
```

첫 쿼리가 성공하면 SQL Editor가 선택한 DB에는 접속한 것입니다. 둘째 쿼리에서 `null`인 테이블이 있으면 그 테이블은 아직 생성되지 않은 것이므로 DB SQL 적용 상태를 확인합니다. 이 쿼리는 데이터 행을 읽거나 바꾸지 않습니다. SQL Editor 연결 성공만으로 웹 서버의 `DATABASE_URL`이 올바르다고 결론 내리지는 않습니다.

실제 앱 스키마를 아직 설치하지 않은 상태에서 DB와 화면을 체험하려면, [2026-11-08-demo-data.sql](../../../prisma/sql/2026-11-08-demo-data.sql)만 Supabase Dashboard → SQL Editor에서 검토 후 실행할 수 있습니다. 이 별도 SQL은 `demo_products`, `demo_customers`, `demo_shipments` 세 테이블에 허구 데이터만 저장하고 anon/authenticated의 읽기만 허용합니다. `/demo`는 이 테이블을 읽습니다. 이는 전체 앱 DB 초기화가 아니며 Supabase Auth 사용자·실제 `users`·구매 요청·결제·운송장을 생성하지 않습니다. demo 테이블은 synthetic 데이터만 공개하므로 개인 정보나 실제 주문 데이터를 추가하지 않습니다. 웹 코드의 새 배포가 `/demo`를 제공합니다.

웹 서버가 실제로 사용하는 DB 연결은 운영자 계정으로 앱의 `/api/health?deep=true`를 호출해 확인합니다. 예상 결과는 HTTP 200 및 `checks.database: true`입니다. 이 endpoint는 운영자 인증과 production 요청 제한 설정이 필요하고 DB에 `SELECT 1`만 실행합니다. 일반 사용자나 인증되지 않은 상태의 401/403은 DB 장애 판정이 아닙니다. 로그인 직후 Supabase Dashboard → **Authentication → Users**에서 시험 계정이 생겼는지 확인하고, 앱 DB의 행은 프로필 저장 후에만 확인합니다. 아직 실제 개인정보를 입력하지 말고, 테스트 계정으로 실행하며 DB 변경 전 백업·검토 없이 SQL `INSERT`/`UPDATE`/`DELETE`, `db push`, migration을 실행하지 않습니다.

Vercel은 HTTP 500이어도 Tailscale의 HTTP 200 응답과 독립된 배포입니다. `Failed to prepare server ... Missing required environment variables: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY` 로그는 서버 시작 설정 오류입니다. 이 경우 세 변수를 Vercel Dashboard → Project → Settings → Environment Variables에서 **Production**에 추가하고 `NEXT_PUBLIC_APP_URL=https://paynship-ochre.vercel.app`도 설정한 뒤 새 production deployment를 생성합니다. 공유한 `.env`의 `DATABASE_URL`은 URL 형식 검사에 실패했으므로 그대로 복사하지 말고 Supabase Dashboard의 Connect에서 올바른 PostgreSQL runtime connection string을 다시 복사하세요. DB 비밀번호가 URL 안에 있으면 URL encoding이 필요합니다. Supabase Auth URL·anon key는 해당 프로젝트의 올바른 값을 사용하되 service role key는 넣지 않습니다.

Build Logs가 아니라 Runtime Logs에 위 오류가 있으면 소스 코드 빌드 실패가 아니라 환경변수 누락으로 프로세스가 시작되지 않은 것입니다. Vercel 환경변수 변경은 이미 생성된 deployment에 소급 적용되지 않으므로 반드시 새 배포가 필요합니다. Vercel Dashboard에서 해당 deployment의 **Runtime Logs / Build Logs**를 열어 첫 예외와 누락 환경변수를 확인하고, Tailscale 서버 설정과 별도로 점검합니다. 로그를 공유할 때 URL·토큰·쿠키·DB 주소·Google Client Secret은 가리고 오류 메시지와 환경변수 이름만 공유합니다.

서버 DB 계정은 신뢰된 앱 역할이고 browser anon/authenticated 역할에는 앱 테이블 권한을 주지 않습니다.

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


## paynship-dh2 첫 화면·계정 배포 (2026-11-12)

Git/Vercel 연결 저장소는 `DongHeeKw/paynship-dh2`인지 확인합니다. Three.js `three`와 개발용 `@types/three` 의존성을 lockfile에 추가했으며 기존 `prisma generate && next build`를 사용합니다. Vercel 설정·기존 Supabase demo SQL·DB schema를 변경하지 않습니다. 홈 장면은 외부 CDN이나 추가 환경변수를 요구하지 않습니다.

Vercel에서 `/`, `/purchase`, `/orders`, `/settings/delivery`, `/login`, `/signup`을 검토합니다. `/orders`와 배송정보 게스트 화면은 설명만 표시하고 실제 개인 데이터는 인증이 필요합니다. `/demo`는 기존 synthetic Supabase 데이터 페이지이고 `/dev/preview`는 로컬 development 전용이므로 Vercel에서는 사용할 수 없습니다. 로컬 `.env`를 업로드하지 말고 Vercel의 Production/Preview 환경변수를 각각 확인합니다. Email provider·이메일 확인·SMTP·Google 및 허용 callback은 실제 프로젝트에서 따로 검증합니다. [입문 안내](../BEGINNER_GUIDE.md)를 참고하세요.
