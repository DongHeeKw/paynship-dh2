# PayNShip

한국 상품 URL을 받아 해외 고객 대신 구매하고 배송하는 서비스입니다. 초기 대상은 아시아권과 미국을 포함한 해외 고객이며, 배송 가능 여부는 상품과 도착국을 확인한 뒤 결정합니다.

URL·도착국 입력 → 로그인 없이 초기 확인·다음 단계 안내 → 로그인 → 배송지 저장·구매 요청 → 운영자 검토 → 견적·외부 결제 → 구매·입고·배송 현황 확인 순서로 사용합니다. 로그인 전 상품 분류·수량·옵션도 입력할 수 있습니다. 첫 확인은 URL 형식·지원 판매처·초기 제한을 안내하며 상품 실재·현재 가격·통관 가능성을 보증하지 않습니다. 기존 샘플 URL에는 수집 날짜가 있는 관찰 정보를 보여줍니다. 크림·코발트·코럴 색상의 Three.js 택배·지구 홈과 이메일 우선 가입·로그인, 게스트 요청 예시·배송정보 설명을 제공합니다. WebGL 실패 시 SVG를 표시하며 장면은 실제 배송 상태가 아닙니다. 대화형 AI와 고객 대시보드는 제거했습니다.

처음 시작하면 [제품·로그인·DB 입문 안내](documents/Reference/BEGINNER_GUIDE.md)를 읽으세요. 이 안내는 `DongHeeKw/paynship-dh2`의 Vercel 화면, 로컬 `/dev/preview`, 기존 Supabase `/demo`를 구분합니다.

서비스 수수료는 **상품 소계의 15%, 판매처 주문당 최소 ₩10,000**입니다. `/purchase`에서 로그인 없이 가격을 입력해 상품+서비스 소계를 확인할 수 있습니다. 배송·보험·관세·세금·통관 비용은 별도이며 미확인 비용은 `Needs review`로 표시합니다. [가격 기준과 데이터 등록](documents/Features/Pricing/Spec.md)을 참고하세요. Google·Apple·Naver 로그인 UI를 제공하며 Apple/Naver는 외부 제공자 설정 전까지 비활성입니다.

## 로컬 실행

Node.js 24 LTS와 npm이 필요합니다. Docker와 AI API 키는 필요하지 않습니다.

```powershell
npm.cmd install
npm.cmd run dev
```

[http://localhost:3000](http://localhost:3000)을 엽니다. 로그인 전 URL 확인·안내는 DB와 Supabase Auth 프로젝트 설정 없이 사용할 수 있습니다. 실제 배송지 저장·구매 요청에는 인증·DB 설정이 필요합니다. Google OAuth 설정 없이 화면 흐름을 확인하려면 개발 서버를 종료한 뒤 다음과 같이 실행합니다.

```powershell
$env:PAYNSHIP_DEV_PREVIEW = '1'
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

[http://localhost:3000/dev/preview](http://localhost:3000/dev/preview)에서 가상 고객으로 배송 입력·요청·상세 화면을 확인합니다. 같은 탭에서 먼저 입력한 유효한 상품 초안은 한 번 읽어 이어가며, 없으면 빈 상품 입력으로 시작합니다. Yes24 예제는 직접 선택할 때만 입력됩니다. 미리보기 변경·주문·문의는 메모리에만 두므로 새로고침하면 초기화되고, 원래 공개 초안은 다시 읽을 수 있습니다. 실제 DB·발주·결제·배송에는 연결하지 않습니다. 개발 모드·명시적 플래그·로컬 host 조건을 모두 확인하며 production에서는 플래그와 관계없이 404입니다. 실제 계정 인증을 우회하는 기능은 없습니다. 실행 방법과 SQL 적용은 [실행 안내](documents/Reference/Deployment/DEPLOYMENT.md)를 따릅니다.

| 환경변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 로컬에서는 `http://localhost:3000` |
| `PAYNSHIP_DEV_PREVIEW` | 개발 서버에서만 `1`로 가상 고객 화면 활성화; 서버 전용 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth |
| `DATABASE_URL`, `DIRECT_URL` | 제한된 PostgreSQL 앱 연결; migration 관리자 연결은 별도 보관 |
| `PII_ENCRYPTION_KEY` | 배송·통관 정보 암호화용 32바이트 키, 64자리 hex |
| `ADMIN_SUPER_ADMINS`, `ADMIN_OPERATORS`, `ADMIN_VIEWERS` | DB isAdmin 계정의 서버 운영자 권한 설정 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 여러 서버가 공유하는 API 요청 제한 |
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET` | 외부 결제와 서명 webhook |

키와 실제 고객 데이터는 커밋하지 않습니다. Vercel·Tailscale을 각각 시험하는 Google 로그인 설정과 실제 DB 연결 확인 순서는 [배포·로그인·DB 점검 안내](documents/Reference/Deployment/DEPLOYMENT.md#두-배포-환경과-google-로그인)를 따릅니다. 실제 계정·DB·결제·배송 연결 검증과 운영 계약은 별도입니다.

## 구현 범위

- 허용 판매처의 HTTPS 상품 URL만 받으며 제출 시 해당 페이지를 가져오지 않습니다. URL 형식 확인과 실제 상품 확인은 구분합니다.
- 식품·식물·동물성 제품·의약품·주류·담배는 초기 사업 범위에서 제외합니다. 나머지도 운영자 검토가 필요합니다.
- 고객은 본인 요청만 조회하고 운영자는 서버에서 검증한 권한으로 처리합니다.
- 신규 배송정보는 암호화합니다. 카드 번호와 CVC는 받지 않으며 결제 제공자의 페이지를 사용합니다.
- 요청 크기, 계정별·전체 제출량, 활성 요청 수, 취소량을 제한하며 중복 제출·동시 상태 변경을 제어합니다.
- 자동 HS 분류·추정 관세·가짜 배송 완료를 사용하지 않습니다.

국가별 검증된 관세 자료, 실제 배송사 계약·gateway 연결, 환불·정산, 개인정보 보존·삭제 운영은 출시 전에 완성해야 합니다. [기능 상태](documents/Features/STATUS.md)에서 구현과 미연결 부분을 확인하세요.

## 유지보수

| 위치 | 책임 |
| --- | --- |
| `app/` | 화면·API 경로 |
| `lib/purchases/` | URL·배송정보·요청·검토·상태·결제·CS의 개별 모듈 |
| `lib/customs/` | 국가별 수취인 정보·형식 검사·검토 근거·출고 조건 |
| `lib/product-evidence/`, `data/samples/` | 운영자용 제한된 상품 증거 수집과 실제/오프라인 샘플 |
| `prisma/schema.prisma` | 신규 모델과 보존 중인 과거 모델 |
| `prisma/sql/` | 검토 후 적용할 신규 DB SQL |
| `tests/` | 권한·할당량·상태·통관 계산 검증 |
| `documents/` | 현재 제품·기능·운영 기준 |
| `docs/plans/` | 현재 작업 계획 |

```powershell
npm.cmd run type-check
npm.cmd run test:ci
npm.cmd run build
```

[제품 기준](documents/PRODUCT_SPECIFICATION.md) · [보안](documents/Reference/SECURITY.md) · [창고·배송·CS](documents/Reference/OPERATIONS.md) · [세금·통관](documents/Reference/TAX_AND_CUSTOMS.md)

다른 Linux 서버에서 저장소를 clone해 출시하는 절차는 [Linux 출시 실행서](documents/Reference/Deployment/LINUX_RELEASE.md)를 따릅니다. [국가별 수취인 요건](documents/Reference/COUNTRY_CUSTOMS.md)과 [상품 수집 샘플](data/samples/README.md)을 함께 확인하세요.

기존 AI·2-pane·54개국 자동 DDP 계획, 중복 문서 스냅샷과 Docker 개발 안내는 폐기했습니다. 남아 있는 과거 API 소스는 middleware에서 410으로 차단하고 과거 관리 화면은 새 구매 관리 화면으로 이동합니다. 과거 DB 데이터는 보존합니다.
