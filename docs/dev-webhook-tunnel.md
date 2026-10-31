# Local Webhook Development — Tunnel Guide

**Context**: Shopify webhook을 로컬 개발 환경(`localhost:3001`)에서 수신하려면 public HTTPS URL이 필요하다.

---

## Option 1: ngrok (가장 일반적)

### 설치
```bash
brew install ngrok    # macOS
# 또는 https://ngrok.com/download
```

### 실행
```bash
# Next.js dev 서버 띄우기
pnpm dev

# 다른 터미널에서 ngrok 터널 시작
ngrok http 3001
# Forwarding: https://abc123.ngrok.io → http://localhost:3001
```

### Webhook 등록
```bash
# .env.local 로드 후 webhook 등록
export $(cat .env.local | grep -v '^#' | xargs)

npx tsx scripts/shopify-v2-webhooks/setup-webhooks.ts \
  --apply \
  --url=https://abc123.ngrok.io/api/webhooks/shopify-v2
```

### 주의
- ngrok free tier URL은 **세션마다 바뀜** → 재시작 시 webhook 재등록 필요
- 결제/주문 같은 중요 webhook 테스트는 ngrok paid plan 또는 Vercel preview 사용 권장

---

## Option 2: Shopify CLI (추천)

Shopify CLI는 자동 터널링 + dev 환경 통합 지원.

### 설치
```bash
brew install shopify-cli
# 또는 npm install -g @shopify/cli @shopify/theme
```

### 실행
```bash
shopify app dev --store=ehj0yx-zs.myshopify.com
# 자동으로 터널 생성 + webhook 라우팅
```

---

## Option 3: Vercel Preview URL

PR 생성 → preview URL 자동 생성 → webhook 등록

```bash
# PR 생성 후 preview URL 확인 (e.g., https://paynship-pr42.vercel.app)
npx tsx scripts/shopify-v2-webhooks/setup-webhooks.ts \
  --apply \
  --url=https://paynship-pr42.vercel.app/api/webhooks/shopify-v2
```

장점: HTTPS 안정적, 환경변수 Vercel에서 공유
단점: 매 배포마다 URL 변경 가능성

---

## Webhook Secret 발급

Webhook을 programmatic하게 등록하면 Shopify가 secret을 반환한다.

### 1) 프로그래밍 등록 (위 Option 1-3 중 하나)
setup-webhooks.ts 실행 후 Shopify Admin에서 secret 확인:
- `Apps → [PayNShip Dev Dashboard] → API credentials` 또는
- `Settings → Notifications → Webhooks` (Admin UI 등록 시)

### 2) .env.local 저장
```env
SHOPIFY_WEBHOOK_SECRET_V2="shpss_..."
```

### 3) 서버 재시작
Next.js dev 서버는 `.env.local` 변경 감지 시 자동 재시작.

### 4) 검증
```bash
# webhook이 401이면 secret 안 맞음
# 200이면 정상
```

---

## 테스트 (webhook 시뮬레이션)

Shopify가 보내는 형태의 curl 요청 (HMAC 서명 필요):

```bash
# test-webhook.sh
#!/bin/bash
BODY='{"id":12345,"name":"#TEST","email":"test@example.com","currency":"USD","total_price":"29.00","line_items":[],"shipping_address":{"country_code":"US"}}'
SECRET="$SHOPIFY_WEBHOOK_SECRET_V2"
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -v -X POST http://localhost:3001/api/webhooks/shopify-v2 \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/paid" \
  -H "X-Shopify-Shop-Domain: ehj0yx-zs.myshopify.com" \
  -H "X-Shopify-Webhook-Id: test-$(date +%s)" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|-----|------|------|
| 401 Unauthorized | HMAC 불일치 또는 secret 없음 | `SHOPIFY_WEBHOOK_SECRET_V2` 확인 |
| 500 Internal error | Handler 예외 | Vercel 로그 / `pnpm dev` 콘솔 확인 |
| Webhook 등록 안 됨 | Scope 부족 | `write_products`, `read_orders` 등 app scope 확인 |
| Duplicate 메시지 | 같은 webhookId | Idempotency로 정상 처리 (200 반환) |
| ngrok connection reset | 무료 tier 세션 타임아웃 | 재시작 or paid plan |
