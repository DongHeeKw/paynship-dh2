# 현재 구조

브라우저 → Next.js 페이지·API → 서버 인증·소유권·역할 검증 → `lib/purchases/` → PostgreSQL입니다.

신규 개인정보는 서버에서 암호화합니다. DB와 공유 Redis가 요청·할당량·경합을 제어합니다. 결제는 Shopify hosted checkout과 서명 webhook을 사용하고, 배송 이벤트는 실제 carrier adapter가 서명 gateway로 전달합니다.

화면·API는 전달을, 각 도메인 파일은 검증·저장·상태·견적·결제·CS의 한 책임을 맡습니다. 파일 안내는 [README](../../README.md), 모델은 [제품 기준](../PRODUCT_SPECIFICATION.md), 접근 경계는 [보안](SECURITY.md)을 사용합니다.

이전 LLM·scraper·대시보드 구조는 현재 구현 기준이 아닙니다.
