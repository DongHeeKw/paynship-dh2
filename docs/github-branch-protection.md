# GitHub Branch Protection 설정 (G5 — 사용자 액션)

> kickoff Step 5의 G5. GitHub UI에서만 가능, 코드로 자동화 불가.

---

## 왜 필요한가

현재 `main` 브랜치에 **직접 push 가능 + force-push 가능**. 다음 사고 시나리오:
- 실수로 `git reset --hard` + force push → commit history 손실
- 사용자/AI 가 PR 없이 직접 main에 push → 검토 없이 production 배포
- 충돌 해결 잘못 → main에 broken commit

이전 발생한 incident:
- `2026-05-15 commit a5513a9` — `.env.vercel.production` 잠시 노출 (force-push로 정리 못 함, 사용자 결정으로 유지)
- `2026-05-15` — inngest 보안 취약점 build 실패 → 직접 push 후 알아차림

## 설정 절차

### 1) GitHub Repository → Settings → Branches
URL: https://github.com/paynshipcompany/paynship-v2/settings/branches

### 2) "Add branch protection rule" 클릭

#### Branch name pattern
```
main
```

#### 필수 옵션 (체크박스)
- [ ] **Require a pull request before merging**
  - [ ] Require approvals: 1 (공동창업자 1명 합의)
  - [ ] Dismiss stale approvals when new commits are pushed
- [ ] **Require status checks to pass before merging**
  - Status checks: Vercel deploy (자동 등록되어 있을 것)
- [ ] **Require linear history** (선택, force-push 사고 완전 차단)
- [ ] **Do not allow bypassing the above settings**
  - 단 owner는 emergency 시 우회 가능 (`Allow specified actors to bypass` — 박요한만)

#### Force push / Deletion
- [x] **Allow force pushes**: OFF
- [x] **Allow deletions**: OFF

### 3) Save

---

## 설정 후 변경되는 워크플로우

| Before | After |
|--------|-------|
| `git push origin main` 직접 가능 | feature 브랜치 → PR → 리뷰 → merge |
| `git push --force origin main` 가능 | 차단됨 |
| AI 가 직접 push | AI 는 PR 생성, 사람 승인 후 merge |

### AI 새 워크플로우 (자동 적용)
```bash
git checkout -b feat/xxx
# ... 작업 + commit ...
git push origin feat/xxx
gh pr create --title "..." --body "..."
# → 박요한 + 공동창업자 리뷰 → squash merge → main
# → Vercel auto-deploy
```

---

## 단점 / 트레이드오프

- 작은 변경도 PR 생성 — 더 느림
- 단순 docs 수정도 리뷰 대기
- AI 가 즉시 production 못 띄움 — 공동창업 의사결정 원칙엔 부합

### Bypass 케이스
- 운영 사고 시 즉시 수정 필요: `Bypass` 권한 (박요한)
- 단순 typo 수정: PR이지만 self-approve 또는 빠른 review
- 외부 lib 보안 패치: Dependabot 또는 자동 머지 규칙

---

## 체크리스트 (사용자가 직접)

- [ ] https://github.com/paynshipcompany/paynship-v2/settings/branches 접속
- [ ] "Add branch protection rule" → `main` 패턴
- [ ] 위 옵션들 체크 + Save
- [ ] 확인: 직접 push 시도 → "protected branch" 오류 발생
- [ ] (옵션) Bypass list 에 `paynshipcompany` 추가 (긴급 우회)

## 완료 후 AI 에게 알리기

`docs/briefing.md` 의 `Deploy Constraints` 섹션에 추가:
```
- main 브랜치 직접 push: 차단됨 (PR 필수)
- AI 작업 워크플로우: feat/xxx → PR → 리뷰 → merge
```
