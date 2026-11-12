# 기능 상태

변경일: 2026-11-12. “코드 있음”은 실제 계정·사업자·DB·배송사 연결 검증을 뜻하지 않습니다.

| 기능 | 현재 구현 | 외부 검증·남은 작업 |
| --- | --- | --- |
| 고객 화면 | Three.js 상자·지구 홈과 SVG 대체, 움직임 줄이기·회전, 공개 FAQ·요청 예시·배송 필드 안내, URL·도착국 입력과 인증 후 요청·CS | URL 파싱은 상품 실재·가격·통관 승인이 아님; 실제 계정과 DB 흐름 확인 |
| 개발 미리보기 | development·명시적 플래그·loopback에서 가상 고객 화면, 유효한 공개 초안 1회 읽기 후 변경은 메모리만 사용; 예제는 직접 선택 | 새로고침 시 변경·새 주문·문의 초기화, 원래 공개 초안 재사용 가능; production 404; 실제 API·인증·DB·발주·결제·배송 검증과 구분 |
| Supabase 데모 페이지 | `/demo`가 `demo_products`, `demo_customers`, `demo_shipments`를 anon 읽기로 표시; 별도 SQL은 synthetic fixture만 seed | [demo SQL](../../prisma/sql/2026-11-08-demo-data.sql)을 Supabase SQL Editor에서 수동 적용해야 함; Auth 사용자가 아니고 실상품·실고객·결제·배송과 무관 |
| AI | 대화·모델 호출·스크래퍼 에이전트 제거 | AI 키 불필요 |
| URL | 정확한 HTTPS 판매처·상품 경로 allowlist | 상품 실재·가격·옵션은 운영자가 확인 |
| 상품 샘플 | 운영자 CLI·robots/응답 제한·공개 페이지 증거·SQLite/JSON 샘플; 입력 Naver Brand URL의 정규화·robots 차단 기록 | Naver 상품 페이지는 요청하지 않음, 상품명·가격·통관 필드 미확인; 차단·누락은 검토 필요 |
| 로그인 | 이메일 우선 가입·로그인과 Google, 확인 메일 안내·내부 복귀 경로·callback 사용자 재검증, HTTPS/loopback 제한·계정 no-store | 실제 Email/SMTP/Google·callback·두 계정 소유권 검증, 비밀번호 복구 |
| 요청 | 본인 소유권, 단건 URL·수량 제한, 검토 대기 | 새 SQL 적용·실제 DB 통합 검증 |
| 남용·동시 처리 | 8 KiB body, DB 할당량, 중복 키, Serializable, 상태 version | Redis 설정·프록시/WAF·실제 병렬 부하 시험 |
| 운영자 | DB 권한·역할 검사, 검토·상태·CS·PII 조회 기록 | 운영자 계정 등록·최소 권한 검증 |
| 개인정보 | 신규 배송·옵션·이벤트 메모·검토·CS 암호화, 응답 투영 | 키 보관·교체·복구, 기존 평문 전환, 보존·삭제 |
| 국가별 수취인 | 6개국 집중 정책·정보 최소 수집·형식 검사·증빙/송장별 출고 gate | 발급/소유자/실제 통관은 형식 검사로 확인되지 않음; 다른 국가 수동 검토 |
| 통관·견적 | 최근 검증 근거·운영자 입력·재현 가능한 CIF/FOB 종가 계산 | 나라·품목별 정책·관세사 검증, 복잡 세목 처리 |
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
