# PayNShip MVP (rebuild 기반 통합) — 프로젝트 입구

해외 K-팬이 한국 상품 URL 하나로 **결제 전에 확정된 관세 포함 총액**을 보고, **대화로 사서 받는** 구매대행 서비스.
세 갈래로 나뉜 코드(A kbuyer-v2 · A' 레거시 · B rebuild)를 **B 하나로 통합**하고 미국 소프트런칭으로 첫 매출을 낸다.

**매 세션 첫 읽기 = 이 파일.** 세부는 아래 문서를 본다. 이 폴더(`paynship/docs/`)는 어느 git 레포에도 속하지 않는다 — 실수로 푸시되지 않는다.

---

## 이 프로젝트의 자리

| 코드 | 위치 | 상태 `[실측 261006]` |
|---|---|---|
| A · kbuyer-v2 | `paynship/kbuyer-v2` (`paynshipcompany/paynship-v2`) | 운영 중 · mock 결제 · 장바구니 진입 불가 · 운영 DB 주문 0 |
| A' · 레거시 루트 | `paynship/kbuyer-latest` (`maybedy/kbuyer` main, worktree `sync/origin-main`) | 7/14 마지막 커밋 · 운영 화면 가장 많음 |
| **B · rebuild** | `paynship/kbuyer-latest/rebuild` | **통합 기반 · M0 작업 위치.** 상태 기계 · 감사 · 기한 감시. 배포 전. Gemini 모델 교체 로컬 반영(미커밋) |

## 문서

| 문서 | 내용 |
|---|---|
| [HANDOFF.md](HANDOFF.md) | **인수인계** — 이어서 개발할 사람용(레포 · 브랜치 · 읽는 순서 · 세팅 · M0 작업 · 확정 결정 · 지켜야 할 것). paynship-v2 레포 루트에도 있다 |
| [plans/261007_v0.3_변경시트.md](plans/261007_v0.3_변경시트.md) | **v0.3 변경 시트 — 261007 확정 결정 · 일정 · B 동작 오기 정정(E1~E13) · 문서별 반영 목록.** 문서끼리 충돌하면 이것이 이긴다 |
| [01_정책서_PayNShip-MVP.md](01_정책서_PayNShip-MVP.md) | 정책서 **읽기용 md(생성물 · v0.3)** — 손으로 고치지 말 것. 정본은 `tools/deckgen/deck_policy_pns.py` |
| [01_정책서_PayNShip-MVP_v0.3.pptx](01_정책서_PayNShip-MVP_v0.3.pptx) | **정책서 배포본(PPTX · v0.3)** — 레스토지니 출퇴근 정책서 틀 클론(로고만 PayNShip 으로 교체) |
| [02_요구정의_기능목록.md](02_요구정의_기능목록.md) | **요구정의 원본(md · v0.3)** — 요구사항 + 메뉴구조 + 기능목록(운영 · 고객 · 시스템) |
| [02_요구정의_기능목록_v0.3.xlsx](02_요구정의_기능목록_v0.3.xlsx) | **배포본(XLSX · 8탭)** — WBS · 우선순위 · 요구사항 · 메뉴구조 · 기능목록 3종 · 확인 필요. md 를 파싱해 생성. WBS · 우선순위 탭만 정본이 `gen_xlsx.py` |
| [03_통합PRD_PayNShip-MVP.md](03_통합PRD_PayNShip-MVP.md) | **통합 PRD(md · v0.3)** — 범위 · 매트릭스 · 화면 · 수용 조건 · 데이터 · 아키텍처 · 지표 · 일정 |
| [03_통합PRD_PayNShip-MVP.html](03_통합PRD_PayNShip-MVP.html) | PRD HTML (md 에서 구움 — 손으로 고치지 말 것) |
| [89_레드팀_사전QA_261006.md](89_레드팀_사전QA_261006.md) | **레드팀 사전 QA + QA 계획** — Critical 2 · Major 9 · Minor 5, 16건 문서 반영(v0.2) · **v0.3: RT-01 · 03 · 06 · 07 · 15b 확정 결정으로 대체 표기** · 개발 단계 검증 계획(§3, v0.3 e2e · v2.2 이관 §3.7) |
| [plans/261007_약관_개정안_목록.md](plans/261007_약관_개정안_목록.md) | **약관 개정안 목록(변호사 · 박요한용)** — 약관 6종 + 금지품목 가이드 + 이용규칙 개정 76건 · 결정 11건(D-a~D-k) **확정(261007 오후)** · 법무 질문 13건. 약관 원본은 고치지 않음 |
| [plans/261006_rebuild_통합_머지계획.md](plans/261006_rebuild_통합_머지계획.md) | **머지 계획(v0.3)** — 확정 결정 S0~S9 · D1~D10 · P-1~P-9 · 단계 M0~M5 · 진행 추적 |
| [researches/261007-전략정책-반영점검/](researches/261007-전략정책-반영점검/) | **전략 · 정책 반영 점검 보고서 4건(107건)** — 01 약관 · 정책 · 02 박요한 v2.2 기획 · 03 사업 · 법인 · 04 김도윤 rebuild 설계 (v0.3 근거) |
| [261006_kbuyer-v2_vs_rebuild_비교.md](261006_kbuyer-v2_vs_rebuild_비교.md) | 코드 · 기술 · Shopify 관점 비교 (근거 문서) |
| [261006_스토리보드_비교_고객_운영자.md](261006_스토리보드_비교_고객_운영자.md) | 고객 15 · 운영자 16 장면 + 관리자 어드민(발주 · 최저가 · 재무) 비교 (근거 문서) |
| [261006_gemini_모델_재평가.md](261006_gemini_모델_재평가.md) | Gemini 모델 벤치마크 · 권고 (근거 문서) |
| [researches/261006-us-de-minimis/README.md](researches/261006-us-de-minimis/README.md) | 미국 $800 면세 · Section 301 · 우편 통관 연구 (1차 출처 검증) |

**v0.2 배포본**(`01_정책서_PayNShip-MVP_v0.2.pptx` · `02_요구정의_기능목록_v0.2.xlsx`)은 v0.3 배포본이 생성되면 **`_archive/` 로 옮긴다.** 새로 쓰거나 공유할 때는 v0.3 만 쓴다.

## 산출물 생성 (단일 출처)

| 문서 | 정본(고치는 곳) | 배포본(굽는 것) |
|---|---|---|
| 정책서 | `tools/deckgen/deck_policy_pns.py` | `01_..._v0.3.pptx` + `01_....md` |
| 요구정의 | `02_요구정의_기능목록.md` (WBS · 우선순위 탭은 `gen_xlsx.py`) | `02_..._v0.3.xlsx` |
| 통합 PRD | `03_통합PRD_PayNShip-MVP.md` | `03_....html` |

```bash
V=~/repo/paynship/docs/tools/deckgen
PY=python3   # lxml · openpyxl · defusedxml · markdown 필요
cd $V
$PY build.py deck_policy_pns ~/repo/paynship/docs/01_정책서_PayNShip-MVP_v0.3.pptx   # 정책서 PPTX
$PY lint.py ~/repo/paynship/docs/01_정책서_PayNShip-MVP_v0.3.pptx                    # 문단 · ID 이상 검사(0 이어야 함)
$PY deck_to_md.py                                                                      # 정책서 md (같은 정본)
$PY gen_xlsx.py                                                                        # 요구정의 XLSX (02 md 파싱 → 02_요구정의_기능목록_v0.3.xlsx)
$PY ~/repo/yohan-skill/shared/scripts/build-doc-html.py ~/repo/paynship/docs/03_통합PRD_PayNShip-MVP.md ~/repo/paynship/docs/03_통합PRD_PayNShip-MVP.html
```

- 생성기는 레스토지니 출퇴근 타각 프로젝트(`restogenie-v3` `feat/attendance-planning` 의 `attendance/tools/deckgen`)에서 가져왔다. 엔진 · 스니펫은 그대로, 내용만 PayNShip 으로 바꿨다.
- 템플릿 `tpl_paynship.pptx` = 원본 `tpl_user.pptx` 에서 **로고 2개(표지 CTRL-M · 간지 RestoGenie)만** PayNShip 워드마크로 교체.
- `gen_xlsx.py` 의 출력 파일명(`OUT`)도 v0.3 으로 맞춰야 한다(정본 수정은 해당 작업자 몫).
- **PPTX 는 PowerPoint 로 열어 확인한다.** LibreOffice 는 한글을 렌더하지 못한다. (261006 PowerPoint → PDF 로 45장 전수 확인)
- `build.py` 는 `~/.claude/skills/synced/.../pptx/scripts` 의 `add_slide` · `clean.py` 를 쓴다.

## 지금 상태 (261007)

- **G0 완료(2026-10-07)** — 박요한 확정 결정(S0~S9 · D1~D10 · P-1~P-9 · 검수 · 관세 초과 · 수익원 · 법인). 최종 결정 = 박요한, 개발 = 인수 개발자(`DongHeeKw`) + AI, 김도윤 = 자문(선택).
- 전략 · 정책 반영 점검 4건(107건) 완료 → **v0.3 변경 시트**가 개정의 단일 기준.
- 계획 문서 **v0.3** 개정 — 부속 문서(레드팀 · 머지 계획 · HANDOFF · README) 반영, 약관 개정안 목록 신규, rebuild ADR 2건(S4 하이브리드 원장 신규 · Gemini Accepted) 로컬 작성. 정책서 · 요구정의 · PRD 본문 v0.3 은 별도 작업자가 반영.
- **261007 오후 추가 확정** — 합포장 MVP 포함(D-g) · 약관 운영값 D-a~D-k 11건 · 수익원 값(마크업 10% · 환율 0.5%) · D3 현행 유지. PRD · 레드팀 · 머지 계획 · HANDOFF · 약관 개정안 목록 반영(정책서 · 요구정의는 별도 작업자).
- 일정: M0 10/08~10/16 → M1 → M2(S4 포함, 4주) → M3 11/23~12/24(합포장 +1주) → M4 12/28~2027-01-29 → **첫 실매출 2027-01 말(G0 후 약 16주)**.
- 다음: M0 착수 · 약관 개정안 변호사 송부 · 결제 수단 두 곳 가입(먼저 끝난 하나로 출시).
- B Gemini 모델 교체는 커밋 `b0e9774`(paynship-v2 두 레포 `rebuild` 브랜치에 푸시됨). v0.3 의 ADR 2건(S4 하이브리드 신규 · Gemini Accepted)은 커밋 `261ce5a` — 두 레포 `rebuild` 브랜치에 푸시됨(261007). 계획 문서 v0.3 은 두 레포 `main` 의 `planning/261006_rebuild-mvp/` 에 커밋 `007de89`.

## 결정 이력

| 날짜 | 결정 |
|---|---|
| 261006 | **B(rebuild) 단일 기반 · git merge 아닌 기능 단위 이식**(머지 계획) — 박요한 입장, 김도윤 합의 필요 |
| 261006 | 박요한 입장 12건 기록 — 1회 결제 + 예외(S1) · 에이전트 v0 MVP(S2) · 수수료 상품가×10% 최소 $5(S3) · 면세 구조 유지 · 미국 값 면세 없음(S5) · USD + 표시 8(S6) · 최저가 · Pivot MVP(S7) · 월 $100(S8) · PortOne + PayPal(S9) · paynship-v2 레포 재사용(D2) · 검수 무응답 발송(D6) · 결제 전 로그인(D7) |
| 261006 | **미국 $800 면세 없음 확정** — EO 14324 · EO 14388 · CBP 규칙 · CIT 판결 · 2027-07 법률 폐지. 한국산 = max(기본관세, 12.5%), 앨범 · CD 예외(9903.05.92), 우편 간이통관 불가 → 특송 DDP |
| 261006 | **LLM** — 추출 `gemini-3.5-flash-lite`(low) · 에이전트 `gemini-3.7-flash`. `gemini-2.5-flash` 는 신규 키로 404 → B 기본값 교체(로컬) |
| 261006 | **레드팀 사전 QA 16건 반영(v0.2)** — B 검수 기본값은 이미 ACCEPT(D6 해소) · 구매 실패 전이 · `purchasedAt` 기록(B 수정은 M0 PR) · 가격 변동은 추가 결제 없음 · 출고 알림 우리 메일 단일 · 취소 · 반품은 요청 접수만 P1 · 파일 저장 · 신규 메일 7종 · 반올림 규칙 |
| 261006 | 계획 문서 양식 = **레스토지니 출퇴근 타각 산출물 양식** (정책서 PPTX 클론 · 요구정의 XLSX 8탭 · 통합 PRD md/HTML · 레드팀 사전 QA) |
| 261007 | **G0 완료 — 박요한 확정 결정(v0.3)**. 위 261006 "박요한 입장 · 합의 필요" 는 모두 확정. 바뀐 것: **S1 = 1회 결제 + 예외 3종**(실측 > 버퍼 · 가격 상승 초과 · 관세 초과) · **S4 = Shopify 하이브리드 원장**(ADR Accepted) · **P-1 초과분 추가 결제**(v0.2 "추가 결제 없음" 번복) · P-2 견적 무게 × 1.2 · P-3 약관대로(5영업일 · 영상 · −DDP −$10) · P-4 판매처 반품비 실비 + $5 · **P-9 구매 전 즉시 셀프 취소 P1** · 디테일 검수 $7 P1 · 관세 초과 고객 부담(무조건 문구 금지) · 수익원 4종 MVP · S9 먼저 끝난 결제 수단으로 출시 · D2 main 교체는 M0 후 · D8 Gemini ADR Accepted(추출 모델) · **D10 최종 결정 = 박요한** · 사업자등록 · 통신판매업 신고 완료. 일정 = 첫 실매출 2027-01 하순. **오후 추가 확정**: 합포장 MVP 포함(D-g — 고객 이익일 때만, 줄어든 차액은 출고 때 부분 환불) · D-a 디테일 검수 항상 고객 확정(제안과 달리 출고 후 문제는 일반 반품 규칙) · D-b 판매처 반품비 교섭 실패 시 고객 차감 · D-c~D-k 등 11건 · 마크업 10% · 환율 0.5% 확정 · D3 현행 유지 → **첫 실매출 2027-01 말(G0 후 약 16주)** |
