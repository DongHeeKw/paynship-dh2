# ADR-2025-12-22: Scraper 모듈화 (llm-parser.ts 분할)

## Status
Accepted

## Context

`llm-parser.ts` 파일이 1367줄로 비대해져 유지보수와 테스트가 어려워졌다:
- 페칭, 파싱, LLM 호출, 정규화가 모두 한 파일에 혼재
- 단위 테스트 작성이 어려움
- 새로운 파서 추가 시 전체 파일 수정 필요

## Decision

llm-parser.ts를 8개 모듈로 분할:

```
lib/scraper/
├── llm-parser.ts         # Facade (re-export만, 하위 호환성)
├── fetcher/
│   ├── stealth.ts        # Patchright 스텔스 모드
│   └── cloudflare.ts     # Cloudflare 우회
├── parser/
│   ├── product-parser.ts # 상품 정보 추출
│   ├── list-parser.ts    # 상품 목록 추출
│   ├── page-detector.ts  # 페이지 타입 감지
│   ├── normalizers.ts    # 데이터 정규화
│   └── llm-caller.ts     # LLM 호출 로직
└── backends/             # (이후 추가)
```

**Facade 패턴 적용**: 기존 `llm-parser.ts`는 re-export만 하여 하위 호환성 유지.

## Consequences

### Positive
- 단일 책임 원칙 준수 (각 모듈이 하나의 역할)
- 단위 테스트 작성 용이
- 새로운 파서 추가 시 해당 모듈만 수정
- 코드 탐색 및 이해 용이

### Negative
- 파일 수 증가 (1개 → 8개)
- import 경로 변경 (Facade로 해결)

### Neutral
- 하위 호환성 유지됨 (기존 import 경로 동작)
- 추후 backends/ 모듈 추가 예정

## Related
- Commit: Phase 1-2 리팩토링 (2025-12-22)
- Spec: [Scraper Spec](../Features/Scraper/Spec.md)
