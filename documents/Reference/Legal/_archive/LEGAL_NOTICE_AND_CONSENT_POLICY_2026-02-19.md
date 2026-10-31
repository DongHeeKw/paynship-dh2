# Legal Notice & Consent Operating Policy

> **Version**: 0.1-draft
> **Date**: 2026-02-19
> **Owner**: Product + Legal + Engineering
> **Status**: Draft (Legal Review Required)
> **Note**: 본 문서는 법률 자문이 아니며, 최종 적용 전 법무 검토가 필요합니다.

---

## 1. Purpose

PayNShip 서비스에서 약관/개인정보처리방침/쿠키 동의를 일관되게 수집하고, 사용자별 동의 증적을 운영 가능한 형태로 보관하기 위한 정책.

---

## 2. Document Inventory

| Doc Type | Required | Draft Doc | Version Rule |
|----------|----------|-----------|--------------|
| Terms of Service | Yes | `documents/Reference/Legal/TERMS_OF_SERVICE_DRAFT_2026-02-19.md` | `terms-YYYY.MM.DD` |
| Privacy Policy | Yes | `documents/Reference/Legal/PRIVACY_POLICY_DRAFT_2026-02-19.md` | `privacy-YYYY.MM.DD` |
| Cookie Policy | Region-based | `documents/Reference/Legal/COOKIE_POLICY_DRAFT_2026-02-19.md` | `cookie-YYYY.MM.DD` |

---

## 3. Consent Data Model (Operational)

사용자 동의 증적은 아래 필드를 최소 저장한다.

- `userId`
- `docType` (`TERMS|PRIVACY|COOKIE`)
- `version`
- `consented` (boolean)
- `consentedAt` (UTC timestamp)
- `ipAddress`
- `userAgent`
- `locale`
- `regionDetected`

동일 사용자/문서/버전 중복 제출은 idempotent upsert로 처리한다.

---

## 4. Region Policy Matrix

| Region | Terms | Privacy | Cookie (non-essential) |
|--------|-------|---------|-------------------------|
| US (default) | 필수 동의 | 필수 고지/동의 기록 | 기본 고지 + 선택 동의(권장) |
| California (US-CA) | 필수 동의 | CCPA/CPRA 고지 준수 | 비필수 쿠키 opt-out/동의 UX 제공 |
| EU/UK | 필수 동의 | GDPR 고지/권리 안내 | 비필수 쿠키 사전 동의(opt-in) 필수 |
| 기타 지역 | 필수 동의 | 지역 규정 우선 | 보수적으로 opt-in 권장 |

초기 릴리스 정책:

- 최소: 모든 지역에서 Terms/Privacy 필수
- 강화: EU/UK는 비필수 쿠키 default-off + 명시적 opt-in

---

## 5. Re-consent Rules

아래 조건에서 재동의를 요구한다.

1. 문서 버전 변경 + 효력 발생(`effectiveAt`) 도달
2. 처리 목적 또는 제3자 제공 범위가 확대된 경우
3. 쿠키 카테고리 추가(예: marketing 쿠키 신규)

재동의 UX 원칙:

- 필수 문서 동의 전 핵심 기능 제한
- 선택 동의는 거부해도 핵심 기능 접근 허용
- 문서 변경 요약(diff summary) 제공

---

## 6. Cookie Category Policy

| Category | Required | Default | Examples |
|----------|----------|---------|----------|
| Strictly Necessary | Yes | ON | 로그인 세션, 보안, 장바구니 유지 |
| Analytics | No | OFF (EU/UK), ON with notice (US default) | 방문/사용량 통계 |
| Personalization | No | OFF | 추천/언어/UI 개인화 |
| Marketing | No | OFF | 광고/리타겟팅 |

필수 아닌 카테고리는 사용자 설정에서 철회 가능해야 한다.

---

## 7. API & UI Mapping

- API 계약: `documents/plans/USER_ACCOUNT_SERVICE_SETTINGS_API_CONTRACT.yaml`
  - `GET /api/legal/documents`
  - `POST /api/legal/consents`
  - `GET /api/account/legal-consents`
- UI
  - 최초 로그인 동의 모달
  - `/settings/legal` 문서/동의 이력
  - 지역 분기 쿠키 배너

---

## 8. Versioning & Release Workflow

상태:

`DRAFT -> LEGAL_REVIEW -> APPROVED -> PUBLISHED -> SUPERSEDED`

운영 절차:

1. Product가 문서 초안 작성
2. Legal 리뷰/수정
3. 승인 후 `effectiveAt` 설정
4. 배포 시점에 `LegalDocumentVersion` 등록
5. 재동의 대상 사용자 계산 후 UX 노출
6. 동의 수집 모니터링 및 누락 경보

---

## 9. Audit & Retention

- 동의 로그 보관: 최소 3년(초안)
- 감사 조회: 사용자별 최신 동의 상태 + 버전별 집계
- 분쟁 대응 시 export 가능한 증적 포맷 제공(JSON/CSV)

---

## 10. Launch Checklist

- [ ] 약관/개인정보/쿠키 문서 법무 승인
- [ ] 문서 version/effectiveAt 시스템 반영
- [ ] 필수 동의 게이트 동작 확인
- [ ] EU/UK 쿠키 opt-in 동작 확인
- [ ] 동의 로그/감사 조회 정상 확인
- [ ] 정책 변경 공지 템플릿 준비

---

## 11. References

- `documents/plans/USER_ACCOUNT_SERVICE_SETTINGS_PLAN.md`
- `documents/plans/USER_ACCOUNT_SERVICE_SETTINGS_PHASE0_DECISIONS.md`
- `documents/plans/USER_ACCOUNT_SERVICE_SETTINGS_BACKLOG.md`
- `documents/plans/USER_ACCOUNT_SERVICE_SETTINGS_API_CONTRACT.yaml`
