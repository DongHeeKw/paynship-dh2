# ADR-2025-12-25: 에이전틱 코딩을 위한 문서 정비

## Status
Accepted

## Context

Claude Code가 효과적으로 작업하기 위해 문서 정비가 필요했다:

1. **CLAUDE.md 부족 사항**
   - 모듈 의존성 맵 없음
   - 최신 아키텍처(Multi-Backend 등) 반영 안 됨
   - 신규 파일들 미기록
   - Single Source of Truth 패턴 위치 불명확

2. **문서 체계 문제**
   - CLAUDE.md와 STATUS.md 간 Feature 테이블 중복
   - Journal 폴더 비어있음
   - 문서 읽는 순서 불명확

3. **코드 탐색 가이드 부족**
   - 새 Action/Backend 추가 시 어떤 파일을 수정해야 하는지 불명확
   - Mock/Real 토글 위치 산재

## Decision

### 1. 역할 분리
- **CLAUDE.md**: 개요 + 개발 규칙 + 흐름도
- **STATUS.md**: 상세 구현 상태 (REAL/PARTIAL/MOCK)

### 2. CLAUDE.md 확장
- Module Dependency Map 추가 (플로우 다이어그램)
- Single Source of Truth 섹션 추가
- Scraper 모듈 상세 구조 추가
- 작업별 체크리스트 추가 (새 Action/Backend 추가 시)
- Documentation Navigation 추가

### 3. Journal 활성화
- ADR (Architecture Decision Records) 형식 채택
- 주요 의사결정 기록 시작

## Consequences

### Positive
- 에이전트가 코드베이스 탐색 시 필요한 정보 즉시 확보
- 하드코딩 위치 명시로 실수 방지
- 문서 간 역할 명확화로 유지보수 용이

### Negative
- CLAUDE.md 파일 길이 증가 (~400줄)

### Neutral
- 기존 문서 구조 유지 (삭제 없음)
- STATUS.md의 상세 정보는 그대로 유지

## Related
- Plan: [에이전틱 코딩 문서 업데이트](../../.claude/plans/steady-stargazing-gadget.md)
- Service Architecture: [SERVICE_ARCHITECTURE.md](../Plans/SERVICE_ARCHITECTURE.md)
