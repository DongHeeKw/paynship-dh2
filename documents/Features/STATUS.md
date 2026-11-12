# 기능 상태

변경일: 2026-11-13. “코드 있음”은 실제 계정·사업자·DB·배송사 연결 검증을 뜻하지 않습니다.

| 기능 | 현재 구현 | 외부 검증·남은 작업 |
| --- | --- | --- |
| 고객 화면 | Three.js 상자·지구 홈과 SVG 대체, 움직임 줄이기·회전, 공개 FAQ·요청 예시·배송 필드 안내, URL·도착국 입력과 인증 후 요청·CS | URL 파싱은 상품 실재·가격·통관 승인이 아님; 실제 계정과 DB 흐름 확인 |
| 개발 미리보기 | development·명시적 플래그·loopback에서 가상 고객 화면, 유효한 공개 초안 1회 읽기 후 변경은 메모리만 사용; 예제는 직접 선택 | 새로고침 시 변경·새 주문·문의 초기화, 원래 공개 초안 재사용 가능; production 404; 실제 API·인증·DB·발주·결제·배송 검증과 구분 |
| Supabase 데모 페이지 | `/demo`가 `demo_products`, `demo_customers`, `demo_shipments`를 anon 읽기로 표시; 별도 SQL은 synthetic fixture만 seed | [demo SQL](../../prisma/sql/2026-11-08-demo-data.sql)을 Supabase SQL Editor에서 수동 적용해야 함; Auth 사용자가 아니고 실상품·실고객·결제·배송과 무관 |
| AI | 대화·모델 호출·스크래퍼 에이전트 제거 | AI 키 불필요 |
| URL | 정확한 HTTPS 판매처·상품 경로 allowlist | 상품 실재·가격·옵션은 운영자가 확인 |
| 상품 샘플 | 운영자 CLI·robots/응답 제한·공개 페이지 증거·SQLite/JSON 샘플; 정확한 SKU·모델·색상·크기 조합별 관찰, 모호한 옵션/가격 거부 | Naver 상품 페이지는 robots 차단으로 요청하지 않음; 실제 판매처 feed·가격 갱신·재고 확인 필요 |
| 로그인 | 이메일 우선 가입·로그인과 Google/Apple/Naver UI, provider별 활성화, Naver 제한된 userinfo adapter, 확인 메일 token-hash 경로·내부 복귀·callback 사용자 재검증 | 실제 Email/SMTP/Google·Apple/Naver 제공자 등록과 credential·callback·두 계정 소유권 검증; Apple/Naver 기본 비활성, 비밀번호 복구 미구현 |
| 요청 | 본인 소유권, 단건 URL·수량 제한, 검토 대기 | 새 SQL 적용·실제 DB 통합 검증 |
| 남용·동시 처리 | 8 KiB body, DB 할당량, 중복 키, Serializable, 상태 version | Redis 설정·프록시/WAF·실제 병렬 부하 시험 |
| 운영자 | DB 권한·역할 검사, 검토·상태·CS·PII 조회 기록 | 운영자 계정 등록·최소 권한 검증 |
| 개인정보 | 신규 배송·옵션·이벤트 메모·검토·CS 암호화, 응답 투영 | 키 보관·교체·복구, 기존 평문 전환, 보존·삭제 |
| 국가별 수취인 | 6개국 집중 정책·정보 최소 수집·형식 검사·증빙/송장별 출고 gate | 발급/소유자/실제 통관은 형식 검사로 확인되지 않음; 다른 국가 수동 검토 |
| 가격 미리보기 | 비로그인 상품가격 입력·15%/최소 ₩10,000 서비스 수수료·항목별 공개 예상 비용, 정수/BigInt 계산·정확한 옵션/수량/국가 매칭·24시간 이내 증거 | 공개 검증 catalog는 비어 있음; 실제 가격·운임·통관 증거를 공급해야 전체 예상 금액 표시; 여러 상품 통합 주문 미구현 |
| 통관·견적 | 신규 US/CN/JP 견적은 검증된 관세·세금·통관 수수료 금액 필수; 현재 수수료 자동 적용·과거 결제 금액 보존, 다른 검토 경로의 기존 CIF/FOB 계산 유지 | 국가별 법정 평가·반올림·환율·복잡 세목은 관세사/운영 검증 필요; 임의 링크의 전 세계 자동 통관 기능이 아님 |
| 결제 | hosted draft·서명 paid·실제 주문/거래 대조·보류 재검증 | 사업자/store·실결제·환불/정산·미결제 draft 정리 |
| 국내 구매·창고 | 운영자 상태·이벤트 기록 | 실제 발주·입고·검수·포장·반품 운영 계약 |
| 배송 | 송장·서명 gateway·중복/역순 방지·서명 이벤트만 완료 | 배송사 계약과 provider adapter·실제 이벤트 검증 |
| 취소·CS | 결제 전 취소, 계정 제한, 요청별 암호화 문의·답변 | 결제 후 취소·환불·차지백·알림·SLA |
| 문서·환경 | 현재 문서 정리·불필요 AI/Docker 설정 제거 | 오래된 기록은 현재 기준으로 사용하지 않음 |
| 과거 경로 | 활성 API 목록 밖은 DB 접근 전 410·관리 화면 이동 | 과거 소스/DB 보존, 복구는 별도 통제 도구 |
| Linux/DB | 도메인→DNS→TLS·clone·최소 권한·체크섬 SQL 실행서·실제 PG16 CI smoke 통과 | 운영 서버 미배포·운영 SQL 미적용; 검증 SHA와 범위는 [실행 기록](../Reference/Testing/SECURITY_CHECKS.md) 참고 |
| 보안 점검 | 자동 검사 231개·공개 준비/입력 URL 보존·개발 미리보기 Chrome 검사 통과; 상품 증거 8개·이전 ZAP 수동 53 URL 기록 | ZAP은 이전 변경 범위이며 새 미리보기 검사는 별도; 낮음 redirect 4건·인증된 계정·DB/RLS·부하 범위는 [실행 기록](../Reference/Testing/SECURITY_CHECKS.md) 참고 |

출시 전에는 SQL·RLS 적용, Redis, 결제 제공자, 실제 판매국의 통관 근거와 배송 gateway를 연결하고 주문 1건을 처음부터 끝까지 검증해야 합니다. 지금 상태를 전 세계 자동 구매·배송 서비스 완료라고 소개하지 않습니다.

검증 결과는 실제 실행한 명령과 결과만 기록합니다. 단위 검증이나 비로그인 ZAP 검사로 개인정보·주문 소유권·결제 정산·모든 국가 지원을 증명하지 않습니다.


## 첫 화면·계정·게스트 흐름 (2026-11-12)

`paynship-v2`에서 만든 시각 경험을 이 저장소에 맞게 옮겼습니다. 기존 Google 오류 처리와 Supabase `/demo`, 목적국·구매/통관 정책을 보존하며 email/password 지원과 필요한 안전한 callback 처리를 추가합니다. `paynship-v2`의 별도 SQLite workspace, 최신 통관 gate나 운영자 MFA, IP proxy는 가져오지 않습니다. 기존 DB·결제·배송 연결이나 실제 제공자 설정을 변경하지 않았습니다. [입문 안내](../Reference/BEGINNER_GUIDE.md)는 이 저장소의 Vercel·로컬 미리보기·DB 데모를 기준으로 설명합니다.

이 저장소에서 `npm run type-check`, `npm run test:ci` (37개 파일·295개 테스트), `npm run docs:check`, `npm run build`를 통과했습니다. production 로컬 서버의 Chromium `e2e/public-journey.spec.ts` 5개 검사도 통과했습니다: WebGL 대체 화면·공개 초안, 비로그인 개인정보 경계·복귀 경로, 가입 비밀번호 확인, 움직임 줄이기·WebGL context 손실, 375–1440px 반응형 화면입니다. 빌드·브라우저 검사는 비활성 DB/Auth 설정으로 수행했으며 실제 이메일 발송·Google 로그인·개인정보 저장·운영 배포 성공을 검증하지 않습니다.

## 수수료·가격 검토·소셜 로그인 (2026-11-13)

승인된 정책은 **상품 소계의 15%, 판매처 주문당 최소 ₩10,000**입니다. 수량에 최저 수수료를 반복 부과하지 않으며 배송·보험·관세·세금·통관 비용을 구분합니다. `/purchase`에서 로그인 없이 입력 가격 기준 상품+서비스 소계를 확인합니다. 알 수 없는 비용은 0원이 아닌 `Needs review`이고 전체 예상 금액은 아직 제공하지 않습니다. [가격 기준](Pricing/Spec.md)에 검증된 공개 데이터 등록·만료·국가별 검토·과거 결제 금액 보존을 설명합니다.

Google·Apple·Naver 버튼과 Naver adapter, 이메일 확인 경로를 구현했습니다. Apple/Naver는 기본 비활성이며 실제 제공자 설정과 Supabase 확인 메일 template, production Redis가 필요합니다. [설정 절차](../Reference/Deployment/DEPLOYMENT.md)를 따라 실제 제공자별 가입·복귀·재로그인을 검증한 후 활성화합니다. 이 변경에서 실제 계정 설정·DB migration·키 변경은 수행하지 않았습니다.

로컬 검증: `npm run type-check`, `npm run test:ci -- --reporter=dot` **44개 파일·379개 테스트**, `npm run product:evidence:test`, `npm run docs:check`, `npm run build` 통과. production 로컬 Chromium `e2e/public-journey.spec.ts` **8개 검사** 통과: 기존 5개에 비로그인 비용 계산·미설정 제공자 비활성·Naver 확인 메일 오류 안내를 추가했습니다. 가격/모바일 로그인 스크린샷도 확인했습니다. 결제 테스트는 clearance 포함 총액·과거 견적·제공자 금액 불일치 거부를 mock으로 확인합니다. 테스트는 합성 데이터와 비활성 외부 연결을 사용했으며 실제 결제·관세사 승인·운임 계약·OAuth 성공을 증명하지 않습니다.
