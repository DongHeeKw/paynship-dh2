# 인증

URL·도착국의 초기 확인과 서비스 절차 안내에는 로그인하지 않아도 됩니다. 이 단계는 DB·상품 페이지·결제 제공자에 접근하지 않으며 실제 고객정보를 서버에 저장하지 않습니다. Supabase Auth 프로젝트 미설정·세션 갱신 장애가 공개 화면을 차단하지 않으며, 실제 개인정보 API는 별도로 인증을 요구합니다. URL 확인은 상품 실재나 통관 승인과 구분합니다.

고객 가입·로그인은 Supabase Auth의 이메일·비밀번호와 Google·Apple·Naver를 제공합니다. Apple·Naver는 배포별 활성화 설정과 실제 제공자 연결이 필요합니다. 서버에서 `getUser()`로 사용자와 이메일 인증을 확인합니다. 고객 ID를 요청 본문에서 받지 않습니다.

실제 배송정보 저장·구매 요청·목록·상세·CS·결제에는 인증이 필요합니다. URL·분류·수량·옵션·도착국 입력을 확인한 뒤 저장·제출 시 로그인으로 이어지며, 로그인 시점의 서버 검증을 생략하지 않습니다. 로그인 이전 상품 초안은 같은 탭의 sessionStorage에 최대 4 KiB·24시간으로 보관해 OAuth 복귀 후 이어갑니다. 주소·신원 식별번호를 초안에 저장하지 않습니다.

운영자 계정은 DB의 `isAdmin`과 서버 환경의 `ADMIN_SUPER_ADMINS`, `ADMIN_OPERATORS`, `ADMIN_VIEWERS`로 관리합니다. 각 API는 필요한 역할을 확인하며 브라우저 metadata를 권한으로 사용하지 않습니다.

## 개발 전용 고객 미리보기

`/dev/preview`는 `NODE_ENV=development`·`PAYNSHIP_DEV_PREVIEW=1`·localhost/loopback 요청일 때만 열립니다. 실제 고객 화면 컴포넌트에 브라우저 메모리 전용 데이터 연결을 사용하며 입력 스키마와 샘플 2개를 포함한 최대 20개 요청·요청당 미해결 문의 3개를 제한합니다. 가상 고객·가상 요청·`SAMPLE_ONLY` 배송 예시는 실제 API·DB·결제·배송과 연결하지 않습니다. 실제 인증 쿠키나 운영자 권한을 만들지 않고 실제 계정으로 로그인했다고 표시하지도 않습니다. production에서는 플래그가 있어도 404이며 `/dev-login`은 계속 폐기 상태입니다.

미리보기는 마운트 후 공개 상품 초안의 5개 필드를 한 번만 읽습니다. 크기·스키마·24시간 만료 검사를 통과한 같은 탭 초안만 복원하고, 유효한 초안이 없으면 빈 입력으로 시작합니다. 읽기 전용 저장소 연결을 사용해 원래 초안을 수정하거나 만료된 값을 삭제하지 않습니다. Yes24 상품은 명시적 예제 선택으로만 입력됩니다. 미리보기 내부 화면 이동에서는 편집 값을 메모리로 이어가고, 새로고침하면 변경·생성 요청·문의가 초기화되어 원래 공개 초안을 다시 읽습니다.

진입·종료는 전체 페이지 이동으로 인증 상태와 미리보기 메모리의 경계를 새로 만듭니다. 미리보기에 관리자·결제·webhook 동작이나 실제 API로 이어지는 fallback은 없습니다.

OAuth 설정은 로컬 미리보기에 필요하지 않습니다. 로그인 시작 오류와 OAuth callback 실패를 화면에 설명합니다. Supabase Auth 사용자는 OAuth 첫 로그인에 생성되며, 앱 PostgreSQL `users` 행은 로그인만으로 생성되지 않고 배송 프로필 저장 등 첫 DB 작업에서 생성됩니다. Supabase Auth의 사용자 목록과 앱 DB의 사용자 행을 구분해서 확인합니다.

Vercel·Tailscale·localhost를 함께 시험하는 Google Cloud Web OAuth client, Supabase provider, redirect URL 설정은 [두 배포 환경과 Google 로그인](../../Reference/Deployment/DEPLOYMENT.md#두-배포-환경과-google-로그인)에 정리되어 있습니다. 운영 DB는 실제 배포의 `/api/health?deep=true`로 앱의 DB 자격 증명을 사용한 읽기 연결을 확인하고, 테이블·migration은 Supabase SQL Editor에서 읽기 전용으로 확인합니다. 로그인만 시험하는 단계에서는 실제 고객 정보나 배송 주소를 쓰지 않습니다.

이메일 테스트 계정은 `/signup`에서 만들고 확인 메일을 거친 뒤 `/login`에서 로그인할 수 있지만, 가입만으로 서버 인증·이메일 확인·개인정보 권한이 생략되지는 않습니다. 실제 데이터로 확인하려면 Auth·DB와 인증된 세션을 준비해야 합니다. 미리보기 통과는 실제 사용자 소유권·DB·제공자 통합 검증을 뜻하지 않습니다.

[보안 기준](../../Reference/SECURITY.md)과 [실행 설정](../../Reference/Deployment/DEPLOYMENT.md)을 함께 확인합니다. 계정 복구, 운영자 MFA, 해지·개인정보 삭제는 출시 전 운영 검증에 포함합니다.


## 이메일 계정과 안전한 복귀 (2026-11-12)

`/login`·`/signup`은 이메일/비밀번호·확인 비밀번호·표시 버튼·가입/로그인 전환·다음 단계 설명을 제공합니다. 가입 비밀번호는 8–72자, 이메일은 최대 254자입니다. 자격 증명은 Supabase SDK로만 전달하고 앱 DB/로그에 저장하지 않으며 계정 존재 여부를 오류로 노출하지 않습니다. 확인 메일은 가입한 브라우저·기기에서 열고 원래 탭으로 돌아와 공개 초안을 이어갑니다. Email provider·Confirm email·실제 SMTP·허용 callback 설정과 계정 생성 검증은 별도입니다.

이메일과 소셜 로그인 동작은 HTTPS 또는 정확한 localhost/127.0.0.1/[::1] HTTP origin에서만 시작합니다. 일반 HTTP IP/Tailscale 주소는 계정 화면 설명만 표시하고 입력·인증 버튼을 비활성화합니다. 계정 간 `next`는 허용된 앱 내부 경로만 이어가며 외부·우회·제어문자 경로를 거부합니다. callback은 코드 교환 뒤 서버 `getUser()`와 확인 이메일을 재검사하고 실패 시 안전한 로그인 화면으로 돌아옵니다. `/login`, `/signup`, `/auth/*`는 private, no-store입니다. Google 실패 설명과 재시도는 유지합니다.

[이메일 인증](https://supabase.com/docs/guides/auth/passwords) · [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [입문 안내](../../Reference/BEGINNER_GUIDE.md). 비밀번호 복구·운영자 MFA 구현은 이번 변경에 포함하지 않습니다.

## Google·Apple·Naver (2026-11-12)

Google과 Apple은 Supabase 내장 OAuth provider를 사용합니다. Google은 기존 설정을 유지하고 Apple은 `NEXT_PUBLIC_APPLE_AUTH_ENABLED=true`인 배포에서만 시작합니다. Naver는 내장 provider가 아니며 Supabase Custom OAuth2 provider 식별자 `custom:naver`로 연결합니다. `NEXT_PUBLIC_NAVER_AUTH_ENABLED=true`는 계정 UI의 시작을, 서버 전용 `NAVER_AUTH_ENABLED=true`는 프로필 변환 endpoint를 활성화합니다. 미설정 제공자의 버튼으로 실제 OAuth를 시작하지 않습니다. 공개 플래그는 연결 검증 결과나 비밀키가 아닙니다.

Naver 프로필의 중첩 `response`를 `GET /auth/naver/userinfo`가 `sub`, `email`, `email_verified: false`만 있는 응답으로 변환합니다. Supabase가 전달한 Naver Bearer 토큰으로 고정된 `https://openapi.naver.com/v1/nid/me`만 호출합니다. 임의 URL·리디렉션·DB 접근·자체 로그인 세션 발급은 허용하지 않으며 요청·응답 크기, 실행 시간, 요청 횟수를 제한합니다. production에서 공유 Redis를 사용할 수 없으면 실패로 처리합니다. 고객 프로필이나 토큰을 저장·기록하지 않습니다.

**Supabase Confirm email은 계속 활성화합니다.** Naver 프로필만으로 이메일 소유권을 확정하지 않습니다. Supabase가 `provider_email_needs_verification`으로 돌아오면 확인 메일 안내를 표시하며, 확인 전에는 private API를 사용할 수 없습니다. 정상 복귀도 코드 교환 뒤 서버에서 확인한 사용자와 이메일 검증을 통과해야 합니다. Naver ID token만 연결하거나 이메일을 확인됐다고 강제 표시하는 방식으로 이 검사를 우회하지 않습니다.

설정·활성화·실계정 점검 순서는 [Apple·Naver 연결](../../Reference/Deployment/DEPLOYMENT.md)을 따릅니다. 이 코드 변경은 외부 개발자 계정·Supabase 설정·Vercel 환경변수를 자동 구성하지 않습니다. 제공자별 첫 로그인·동의 거절·확인 메일·동일 사이트 복귀와 두 계정의 데이터 분리를 실제 테스트 환경에서 확인한 뒤 공개 활성화합니다.
