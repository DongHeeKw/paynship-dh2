# Agent 테스트 및 개선 루프

> ⚠️ **DEPRECATED (2025-12-15)**
>
> 이 문서는 수동 테스트 스크립트 기반 접근 방식을 설명합니다.
> **자동화된 테스트 시스템**이 구축되었으므로 아래 문서를 참조하세요:
>
> - **[TEST_RESULTS.md](./TEST_RESULTS.md)** - 최신 테스트 결과 및 커버리지
> - **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - 테스트 인프라 현황
>
> ### 새로운 테스트 명령어
> ```bash
> # 단위/통합 테스트 (Vitest)
> npm test              # 전체 테스트 실행
> npm run test:watch    # 워치 모드
> npm run test:coverage # 커버리지 리포트
> npm run test:ui       # Vitest UI
>
> # E2E 테스트 (Playwright)
> npm run test:e2e         # 헤드리스 모드
> npm run test:e2e:headed  # 브라우저 표시
> npm run test:e2e:ui      # Playwright UI
> ```

---

# [아래 내용은 참고용으로 보존됨]

## 개발 철학

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    귀납적 관찰 + 연역적 기획 루프                            │
│                                                                              │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      │
│    │  Test    │ ───▶ │ Observe  │ ───▶ │ Analyze  │ ───▶ │  Plan    │      │
│    │ (실행)   │      │ (관찰)   │      │ (분석)   │      │ (기획)   │      │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘      │
│         ▲                                                      │            │
│         │                                                      │            │
│         │            ┌──────────┐      ┌──────────┐           │            │
│         └─────────── │  Verify  │ ◀─── │ Improve  │ ◀─────────┘            │
│                      │ (검증)   │      │ (개선)   │                        │
│                      └──────────┘      └──────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 테스트 환경 구축 ✅

### 테스트 도구

```bash
# 전체 시나리오 테스트
npx ts-node scripts/test-agent.ts

# 특정 카테고리만
npx ts-node scripts/test-agent.ts --scenario "abstract"

# 인터랙티브 모드 (실시간 테스트)
npx ts-node scripts/test-agent.ts --interactive
```

### 테스트 시나리오 카테고리

| 카테고리 | 설명 | 예시 |
|----------|------|------|
| `abstract` | 추상적/주관적 요청 | "명반 추천", "선물용" |
| `concrete` | 구체적 요청 | "BTS 앨범 검색", URL |
| `followup` | 멀티턴 대화 | "더 찾아봐", "그거 담아" |
| `preference` | 개인화 관련 | "내 취향 뭐야?" |
| `edge` | 엣지 케이스 | "날씨 어때?", 모호한 요청 |

---

## Phase 2: 1차 테스트 실행

### 테스트 실행 방법

```bash
# 1. 서버 실행 (별도 터미널)
npm run dev

# 2. 테스트 실행
npx ts-node scripts/test-agent.ts 2>&1 | tee test-results-$(date +%Y%m%d).log
```

### 관찰 포인트

각 응답에서 확인할 것:

```
┌─────────────────────────────────────────┐
│ 1. 의도 파악 정확성                      │
│    - LLM이 의도를 제대로 이해했나?       │
│    - 컨텍스트를 활용했나?                │
│                                         │
│ 2. 액션 적절성                           │
│    - 올바른 action type 선택?            │
│    - params가 적절한가?                  │
│                                         │
│ 3. 응답 품질                             │
│    - 자연스러운가?                       │
│    - 유용한 정보 포함?                   │
│    - 다음 단계 안내?                     │
│                                         │
│ 4. UI 컴포넌트                           │
│    - 적절한 컴포넌트 선택?               │
│    - 버튼 등 액션 제공?                  │
│                                         │
│ 5. 메모리 업데이트                       │
│    - 필요한 정보 저장?                   │
│    - 개인화에 활용 가능?                 │
└─────────────────────────────────────────┘
```

---

## Phase 3: Gap 분석 템플릿

### 분석 문서 양식

```markdown
## Gap Analysis: [시나리오 이름]

### 입력
"[사용자 메시지]"

### 기대 동작
- [ ] [기대 1]
- [ ] [기대 2]

### 실제 동작
- Response: "..."
- Action: ...
- UI: [...]

### Gap 식별
| Gap | 심각도 | 원인 추정 |
|-----|--------|-----------|
| ... | High/Med/Low | ... |

### 개선 방안
1. ...
2. ...

### 수정 필요 파일
- [ ] lib/agent/llm-orchestrator.ts: ...
- [ ] System prompt: ...
```

---

## Phase 4: 개선 패턴

### Pattern 1: System Prompt 수정

```typescript
// 문제: LLM이 특정 상황을 처리 못함
// 해결: System prompt에 가이드라인 추가

const SYSTEM_PROMPT = `
...existing...

## [새로운 섹션]
When user asks for [상황]:
- [지시 1]
- [지시 2]
- [지시 3]
`;
```

### Pattern 2: Action Handler 추가

```typescript
// 문제: 새로운 유형의 액션 필요
// 해결: Action type 및 handler 추가

// 1. Type 추가
type: '...' | 'new_action';

// 2. Handler 추가
case 'new_action': {
  // Implementation
  break;
}
```

### Pattern 3: Context 강화

```typescript
// 문제: LLM에 전달되는 컨텍스트 부족
// 해결: buildContextPrompt() 수정

function buildContextPrompt(memory: MemoryBlock): string {
  // 새로운 컨텍스트 정보 추가
  if (memory.session.newField) {
    parts.push(`[New Context]\n${memory.session.newField}`);
  }
}
```

### Pattern 4: Memory 확장

```typescript
// 문제: 특정 정보를 기억해야 함
// 해결: Memory block 확장

interface MemoryBlock {
  session: {
    ...existing,
    newField: string | null;
  };
}
```

---

## Phase 5: 반복 체크리스트

### 각 이터레이션마다

```
□ 테스트 실행
  □ 전체 시나리오 실행
  □ 실패 케이스 기록

□ 관찰 및 분석
  □ 각 실패 케이스 Gap 분석
  □ 패턴 식별 (공통 원인?)
  □ 우선순위 결정

□ 개선 구현
  □ 가장 높은 우선순위 Gap 수정
  □ TypeScript 체크
  □ 관련 시나리오 재테스트

□ 검증
  □ 수정된 시나리오 통과?
  □ 기존 시나리오 회귀 없음?
  □ 새로운 엣지 케이스 발견?

□ 문서화
  □ 변경 사항 기록
  □ 시나리오 추가/수정
  □ 커밋
```

---

## 시나리오 우선순위

### Round 1 (현재)

| # | 시나리오 | 우선순위 | 이유 |
|---|----------|----------|------|
| 1 | 명반 추천 (추상적) | High | 핵심 기능, LLM 지식 활용 테스트 |
| 2 | Followup - 더 찾기 | High | 멀티턴 컨텍스트 테스트 |
| 3 | 암묵적 불만 | Medium | 개인화 + 추론 테스트 |
| 4 | 취향 확인 | Medium | 메모리 시스템 테스트 |
| 5 | 모호한 요청 | Low | 엣지 케이스 |

### Round 2+ (이후)

테스트 결과에 따라 동적으로 결정

---

## 성공 기준

### 시나리오별 Pass 기준

```typescript
interface PassCriteria {
  // 의도 파악
  intentCorrect: boolean;      // LLM이 의도를 올바르게 파악

  // 액션 적절성
  actionCorrect: boolean;      // 올바른 action type
  paramsCorrect: boolean;      // 적절한 parameters

  // 응답 품질
  responseHelpful: boolean;    // 유용한 응답
  responseNatural: boolean;    // 자연스러운 톤

  // 컨텍스트 활용
  contextUsed: boolean;        // 이전 대화 활용

  // 개인화
  preferenceLearned: boolean;  // 선호도 학습 (해당 시)
}

// Pass = 모든 해당 기준 충족
```

### 전체 Pass 기준

```
- Abstract 시나리오: 80% 이상 Pass
- Concrete 시나리오: 95% 이상 Pass
- Followup 시나리오: 85% 이상 Pass
- Preference 시나리오: 80% 이상 Pass
- Edge 시나리오: 70% 이상 Pass (graceful handling)
```

---

## 다음 단계

1. **지금**: 서버 실행 후 1차 테스트
2. **관찰**: 실제 응답 패턴 기록
3. **분석**: Gap 식별 및 우선순위화
4. **개선**: 가장 큰 Gap부터 수정
5. **반복**: 2-4 반복

---

*최종 업데이트: 2025-12-09*
