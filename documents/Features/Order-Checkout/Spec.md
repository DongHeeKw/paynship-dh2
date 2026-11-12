# 구매 요청·결제·상태

## 2026-11-13 수수료와 수입 비용

신규 수수료는 상품가×수량의 15%, 판매처 주문당 최소 ₩10,000이며 정수 산술로 원화 반올림 후 승인 환율로 USD cents에 변환합니다. 운영자 수수료 입력은 신규 견적에 적용하지 않습니다. 정책 ID·원화 수수료·환율을 보존하고 결제한 과거 견적은 변경하지 않습니다. 현재 요청은 한 상품/수량으로 한 판매처 주문입니다. 여러 요청을 한 checkout으로 합치는 기능은 없으며 묶음 구매 최소 수수료 중복 부과를 막으려면 별도 grouping 절차가 필요합니다.

신규 USA·China·Japan 견적은 증빙에 근거한 `verifiedImportCharges`(관세·세금·통관비 USD cents)를 요구합니다. 이는 generic 관세·세금 산식을 대체하며 이중 가산하지 않습니다. 통관비는 고객 견적·Shopify 결제의 독립 항목입니다. 근거 만료·HS 사업 범위·수취인·소유권·결제 검증은 유지합니다. 과거 결제 견적 재검토는 과거 수수료·산술과 모든 금액의 일치를 확인합니다.

공개 계산기는 요청/결제를 생성하지 않습니다. 고객 입력 가격은 제품+수수료 계산용이며 미확인 세금은 0으로 표시하지 않습니다. 공개 catalog 합계 조건과 한계는 [가격 명세](../Pricing/Spec.md)를 따릅니다.

변경일: 2026-10-12.

## 로그인 전 안내

고객은 URL·분류·수량·옵션·도착국을 입력한 뒤 로그인 없이 URL 형식·허용 판매처·초기 사업 범위와 국가별 수취인 준비 정보를 확인합니다. 이 과정은 구매 요청 생성이 아니며 DB·상품 페이지·결제에 접근하지 않습니다. 기존 수집 샘플 3개의 URL과 일치할 때만 수집 날짜·판매처·관찰 상품명·당시 KRW 가격을 보여줍니다. 다른 URL의 상품 정보는 미확인으로 표시하고 상품 실재·현재 가격·재고·배송 가능 여부·세율을 추정하지 않습니다.

로그인은 저장·제출 단계에서 요구합니다. 상품 초안 5개 필드는 같은 탭의 sessionStorage에서 최대 4 KiB·24시간으로 보관하며 OAuth 복귀 후 이어갑니다. 주소·통관 식별번호는 초안에 보관하지 않습니다. 실제 배송정보 저장·구매 요청은 인증 후 서버 정책으로 다시 검증합니다.

개발 전용 `/dev/preview`는 동일 고객 화면의 가상 데이터 흐름을 보여줍니다. 서버 인증과 실제 고객 API를 대체하지 않으며 실제 발주·결제·배송 상태를 변경하지 않습니다. [실행 조건](../../Reference/Deployment/DEPLOYMENT.md#로그인-설정-없이-고객-화면-확인)을 참고합니다.

## API

고객 API는 이메일 인증된 서버 사용자와 소유자를 검증합니다. 모든 JSON 변경 본문은 8 KiB 이내이며 정해진 필드만 허용합니다.

| 경로 | 메서드·역할 |
| --- | --- |
| `/api/delivery-profile` | GET·PUT·DELETE: 본인 암호화 배송 프로필 |
| `/api/purchases` | GET: 본인 목록, POST: URL 1개 접수 |
| `/api/purchases/[id]` | GET: 본인 상세·이벤트·CS |
| `/api/purchases/[id]/cancel` | POST: 결제 전 본인 취소·version |
| `/api/purchases/[id]/checkout` | POST: 검토된 현재 견적의 외부 결제 생성 |
| `/api/purchases/[id]/support` | POST: 본인 요청의 문의 |
| `/api/admin/purchases` | GET: viewer 이상 목록 |
| `/api/admin/purchases/[id]` | GET·PATCH: operator 이상 PII 상세·검토·상태 |
| `/api/admin/support` | GET: 운영자 문의 목록 |
| `/api/admin/support/[id]` | PATCH: 운영자 답변·완료 |
| `/api/admin/admin-settings` | GET·PATCH: 검증된 super_admin의 점검·결제 활성 설정 |
| `/api/webhooks/purchases` | POST: Shopify orders/paid·HMAC·store·주제 확인 |
| `/api/webhooks/shipping` | POST: carrier gateway HMAC·시각·송장 확인 |

생성 입력은 `sourceUrl`, `category`, `quantity`(1–10), `options`, UUID `idempotencyKey`입니다. 저장된 배송 프로필을 요청별 암호화 스냅샷으로 복사합니다. 고객은 가격·검토·결제 성공·배송 상태를 지정할 수 없습니다.

## 상태

`REVIEW_REQUIRED → QUOTED → PAYMENT_PENDING → PAID → PURCHASING → AT_WAREHOUSE → READY_TO_SHIP → SHIPPED → DELIVERED`

검토·견적 단계에서는 거절·결제 전 취소가 가능합니다. 결제 이후 문제는 `ON_HOLD`와 CS로 처리합니다. 복구는 서버가 이력·결제 증거로 판별한 이전 상태로만 진행합니다. 결제 생성 실패·만료 후 입금처럼 결제 제공자 대조가 필요한 보류는 단순 상태 변경으로 해제하지 않습니다.

상태 변경은 제출한 version과 DB version이 일치해야 합니다. 고객·운영자 이벤트와 제공자 이벤트의 출처를 보존합니다. 운영자가 배송을 갱신했다면 배송사 스캔으로 표시하지 않습니다.

운영자가 직접 지정할 수 있는 상태는 PURCHASING·AT_WAREHOUSE·READY_TO_SHIP·SHIPPED·ON_HOLD입니다. DELIVERED는 서명된 배송사 gateway 이벤트로만 반영합니다. 상세 이벤트는 최근 100개를 시간순으로 제공하며 결제 수신·구매 시작 여부를 별도로 보여줍니다. 과거 API는 middleware의 활성 경로 목록에서 제외되어 DB 접근 전에 410을 반환합니다.

## 운영자 검토와 보류 해제

| PATCH action | 조건·효과 |
| --- | --- |
| `quote` | 결제 시작 전 상품·통관·수취인 근거를 확인하고 견적 생성 |
| `recipient_review` | 현재 요청의 문서·배송사 수취인 근거 갱신; 견적 금액은 유지 |
| `reconcile_payment` | 지정 Shopify draft의 실제 완료 주문·금액·성공 거래를 제공자에 대조 |
| `revalidate` | 제공자 확인 결제 후 구매 시작 전 보류의 최신 근거 확인; 이미 결제된 비용은 변경 불가 |
| `resume` | 서버가 이력으로 정한 기존 업무 단계로만 보류 해제 |
| `reject`, `status` | 허용 단계와 version을 검증한 거절·업무 상태 변경 |

상품 HS·원산지·재질·중량·치수·공식 규칙 URL·상품 증거 URL·검증/만료 시각·수취인 검토 증거는 암호화 저장합니다. [국가별 계약](../../Reference/COUNTRY_CUSTOMS.md)의 형식 검사는 신원·발급·소유자 확인이 아닙니다. 구매 시작과 출고에는 단계별 수취인 근거가 필요하며 대만 출고 근거는 해당 송장과 연결합니다. 구매가 시작된 보류를 PAID로 되돌려 재발주하지 않습니다.

## 결제

Shopify draft checkout의 항목별 금액·USD presentment 통화·합계를 승인 견적과 확인합니다. 할인과 자동 세금으로 승인 금액이 바뀌지 않게 구성합니다. 결제 URL은 허용된 HTTPS Shopify 주소만 반환합니다.

최초 결제 생성은 트랜잭션으로 `PAYMENT_PENDING`을 먼저 확보하여 경쟁 생성 요청을 차단합니다. 제공자 timeout은 성공 여부가 불명확하므로 자동으로 두 번째 draft를 만들지 않고 보류·대조합니다.

미결제 `PAYMENT_PENDING` 요청에 저장된 checkout이 있고 견적이 유효하면 고객은 `Continue payment`로 같은 결제를 다시 열 수 있습니다. URL을 상세 DTO로 공개하지 않고 서버 소유권 검사 후 checkout API에서 반환합니다. 재진입 시에도 현재 통관·수취인 근거를 확인하며, 만료된 근거와 보류 상태는 새 결제를 만들지 않습니다.

결제 성공은 raw body HMAC, store·topic, 구매 요청·견적 버전·USD presentment 금액을 확인한 paid webhook으로 반영합니다. 제공자의 draft→최종 주문 연결, USD 금액·완전 결제·성공 거래 시각도 대조합니다. webhook의 presentment_money를 읽고 production 테스트 거래는 거절합니다. 이벤트 영수증으로 재시도를 중복 처리하지 않으며 실제 결제 시각이 견적 만료 이후이면 보류합니다. 운영자의 reconcile도 같은 제공자 확인을 거치고 과거 구매·출고 단계로 진행한 요청을 새 PAID로 초기화하지 않습니다. 실제 store·결제 통화는 실결제로 검증합니다.

현재 결제 후 환불·차지백·정산 대조는 출시 전 남은 작업입니다. 실제 운영 흐름에는 결제나 배송을 완료했다고 표시하는 mock 기능이 없습니다. 개발 전용 미리보기의 명시적 가상 배송 예시는 실제 고객 API·provider와 연결하지 않습니다.

DB 점검 설정은 새 요청·checkout을 중단하고 shopifyEnabled=false 또는 과거 useMockCheckout=true이면 결제 생성을 차단합니다. 관리 API는 maintenanceMode·shopifyEnabled만 변경하며 AI/mock 플래그를 공개하지 않습니다. DB 설정을 읽지 못하면 진행하지 않습니다.

## 배송 gateway

실제 배송사 adapter가 아래 계약으로 정규화하고 raw body에 HMAC-SHA256 Base64 서명을 넣습니다.

`eventId, requestId, carrier, trackingNumber, status, occurredAt, sentAt`

`status`는 IN_TRANSIT·CUSTOMS_CLEARANCE·OUT_FOR_DELIVERY·DELIVERED·EXCEPTION 중 하나입니다. 전송 시각은 5분 범위로 확인하며 요청에 저장한 배송사·송장과 일치해야 합니다. 이벤트 ID를 중복 처리하지 않고 이전 발생 시각으로 상태를 되돌리지 않습니다.

배송사별 adapter·계약·gateway 설정은 아직 외부 검증이 필요합니다. endpoint가 있다는 이유로 실시간 배송이 연결됐다고 말하지 않습니다.

CS 생성·운영자 답변은 암호화하며 답변 version 경합을 확인하고 PII 조회를 기록합니다. 실제 환불 API·취소된 미결제 draft 정리·보존/삭제·알림 운영은 별도입니다.

[보안](../../Reference/SECURITY.md) · [실제 운영](../../Reference/OPERATIONS.md)
