# ADR: Scraper Server Split (Main App → Standalone Server)

> **Date**: 2026-02-12
> **Status**: Accepted & Implemented
> **Deciders**: Engineering

---

## Context

Main App(Next.js on Vercel)이 `lib/scraper/` 내부에서 직접 Patchright 브라우저를 실행해 스크래핑 중이었다.

**문제점:**
1. **Vercel 배포 불가**: Vercel Serverless Functions에서는 Chromium 실행 불가 (바이너리 크기 제한 + 프로세스 제한)
2. **번들 크기**: patchright + playwright + chromium-bidi가 수백 MB — Vercel 50MB 제한 초과
3. **리소스 분리**: 브라우저 인스턴스와 웹서버가 같은 프로세스에서 메모리/CPU 경쟁
4. **확장성**: 스크래핑 부하를 독립적으로 스케일링 불가

## Decision

**Scraper Server(`packages/scraper-server`)를 별도 프로세스로 분리하고, Main App은 클라이언트로 통신.**

### 통신 방식
- **WS (WebSocket)**: 전체 스크래핑 파이프라인 — progress 이벤트 스트리밍 가능
- **REST POST /fetch**: 단순 HTML 페치 — 요청/응답 패턴 (Agent의 fetchHTML용)
- **REST GET /health**: 헬스 체크

### 핵심 설계 결정

| 항목 | 결정 | 대안 | 이유 |
|------|------|------|------|
| 통신 프로토콜 | WS + REST | REST only | WS로 progress 스트리밍 가능, 긴 스크래핑 작업에 적합 |
| 클라이언트 싱글톤 | `getScraperClient()` → `null` if no URL | throw on missing | 환경변수 없을 때 graceful degradation (mock 모드 동작) |
| Deep Extraction | 로컬 실행 (서버는 HTML만 제공) | 서버에서 전부 | 파싱 로직은 Main App에 유지하는 것이 테스트/디버깅 용이 |
| WS URL → REST URL | 자동 유도 (`ws:` → `http:`, `/ws` 제거) | 별도 환경변수 | 환경변수 1개로 충분 |
| 브라우저 코드 | 완전 삭제 (Phase 5) | 폴백으로 유지 | 중복 코드 제거, Vercel 배포 차단 해소 |

## Consequences

### Positive
- Vercel 배포 가능 (브라우저 바이너리 없음)
- 스크래퍼 독립 스케일링 (VPS, Docker 등)
- 번들 크기 대폭 감소
- Main App과 Scraper의 관심사 분리

### Negative
- 개발 시 두 서버 동시 실행 필요 (`npm run dev:all`)
- 네트워크 레이턴시 추가 (로컬: ~1ms, 원격: ~10-50ms)
- Scraper Server 다운 시 스크래핑 완전 불가 (mock 모드만 가능)

### Risks
- WS 연결 끊김 시 재연결 로직 필요 (구현됨: exponential backoff, 최대 5회)
- Scraper Server 모니터링/운영 부담 추가

## Files Changed

**Created**: `lib/scraper/client.ts`, `scripts/dev.sh`, `scripts/start-scraper.sh`
**Rewritten**: `lib/scraper/index.ts`, `lib/scraper/fetcher/index.ts`
**Deleted**: 17 browser-dependent files (browser-engine, stealth, coupang, naver, hybrid, agentic/*, backends/*)
**Dependencies removed**: patchright, playwright, chromium-bidi
