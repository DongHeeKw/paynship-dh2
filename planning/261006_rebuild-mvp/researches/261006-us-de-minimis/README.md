---
title: 미국 $800 소액 면세(de minimis) 현황과 PayNShip 견적 엔진 설정
date: 2026-10-06
owner: 박요한
status: 검증 완료 (1차 출처 대조) · 관세사 확인 대기
tags: [customs, de-minimis, US, DDP, section-301, korus]
---

# 미국 $800 소액 면세(de minimis) — 2026-10 현황과 PayNShip 적용

> 대상 독자: 박요한, 김도윤 — 머지 계획 결정 S5("$800 면세 구조 유지")를 판단하기 위한 자료
>
> 방법:
> - Gemini **Deep Research Max**(`deep-research-max-preview-04-2026`)를 2회 실행했다. 원본은 `references/`에 있다.
>   - 2차 전체본: `deep-research-max-raw.md`, `.json`
>   - 1차 잘린본: `deep-research-max-run1-truncated.md`
> - **DR은 핵심 세율(한국 301)을 틀렸다(10% vs 원문 12.5%).** 이 문서의 수치는 모두 1차 출처 기준이다(§5).
> - Claude가 1차 출처(백악관, CBP, Federal Register, USTR 원문)와 하나씩 대조해 검증했다.
>
> 딱지:
> - `[1차]` 정부 원문으로 확인
> - `[2차]` 로펌·언론 등 2차 출처
> - `[DR]` Deep Research만 근거
> - `[미확인]` 확인하지 못함
> - `[가설]` 추론

---

## 0. 결론 (5줄)

1. **현재 한국발 상업 소포는 $800 이하여도 미국에 면세로 들어갈 수 없다.**
   - 2025-08-29부터 전 세계 대상으로 면세가 정지됐다(EO 14324).
   - 2026-02 IEEPA 관세 무효 판결 이후에도 정지는 유지됐다(EO 14388, CBP 규칙 2026-06-24 및 07-24).
   - 2026-08 법원이 이 정지를 합법으로 판단했다(CIT, *Axle of Dearborn*).
   - **2027-07-01부터는 법률(OBBBA)로 면세 조항이 아예 폐지된다.** `[1차·2차]`
2. 따라서 "미국에 $800 면세를 실제로 적용"하는 설정은 **현행법과 맞지 않는다.** 관세 선납(DDP) 견적에서 빠진 관세는 회사가 부담하게 된다.
3. 반대로 **"국가별 면세 기준을 설정값으로 두는 구조"는 유지할 가치가 있다.** 일본 ¥10,000, EU €3 등 다른 국가에 필요하고, 미국 값만 "면세 없음"으로 두면 된다. B(rebuild)가 이미 이렇게 설계돼 있다.
4. **지금 한국산에 붙는 미국 관세는 대부분 "기본관세+Section 301 합계 12.5%"다** (USTR, 2026-07-24 시행). KORUS FTA로 기본관세가 0%여도 12.5%까지 채워진다. **K-pop 앨범(CD·포토북)은 정보 간행물 예외로 Section 301에서 빠진다.** `[1차]`
5. **우편(EMS)보다 특송이 맞다.** 2026-07-24에 시작된 새 우편 간이통관 절차는 Section 301 대상 물품을 받지 않는다. 그래서 한국산 대부분은 우편 간이통관을 쓸 수 없다. `[1차]`

---

## 1. 타임라인 `[1차 중심]`

| 날짜 | 조치 | 근거 |
|---|---|---|
| 2025-05-02 | 중국·홍콩발 면세 정지 | EO 14256 계열 `[2차]` |
| 2025-07-04 | OBBBA 제정. §1321 상업 화물 면세를 **2027-07-01자로 법률상 폐지** | P.L. 119-21 `[2차: 다수 로펌]` |
| 2025-07-30 | **EO 14324** 서명. 전 세계 면세 정지를 **2025-08-29 시행**. "가액, 원산지, 운송수단, 통관방식과 무관" | [whitehouse.gov EO 14324](https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/), [CBP fact sheet](https://www.cbp.gov/sites/default/files/2025-08/factsheet_suspension_of_duty-free_de_minimis_treatment.pdf) `[1차]` |
| 2025-09-22 | 우정사업본부, 미국행 우편을 관세 선납(DDP) 방식으로 재개 | 국내 보도 `[2차]` |
| 2026-02-20 | **대법원: IEEPA는 관세 부과 권한이 아니다.** IEEPA 상호관세·펜타닐 관세 종료 | [CRS LSB11398](https://www.congress.gov/crs-product/LSB11398) `[1차]` |
| 2026-02-20 | **EO 14388** "Continuing the Suspension of Duty-Free De Minimis Treatment for All Countries". 면세 정지의 근거를 다시 세움 | [whitehouse.gov EO 14388](https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/) `[1차]` |
| 2026-02-24 | Section 122 일시 부과금 10%(Proclamation 11012). 150일 한시 | FR 2026-12669 본문 `[1차]` |
| 2026-06-24 | CBP 규칙: **우편 외 모든 경로의 면세를 무기한 정지.** $800 이하도 정식·간이 통관 필수 | [FR 2026-12670](https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other) `[1차]` |
| 2026-07-24 | CBP 규칙: **우편 면세 무기한 정지 + 새 우편 간이통관 절차.** 같은 날 Section 122 만료 | [FR 2026-12669](https://www.federalregister.gov/documents/2026/06/24/2026-12669/indefinite-suspension-of-the-de-minimis-exemption-for-mail-shipments-and-new-postal-informal-entry) `[1차]` |
| 2026-07-24 | **USTR 강제노동 Section 301 시행(60개국).** 한국은 기본관세와 합쳐 12.5% | [USTR 최종 조치 원문](https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf) `[1차]` |
| 2026-08-13 | CIT *Axle of Dearborn (Detroit Axle) v. Commerce*: 면세 정지는 합법(IEEPA로 "특혜 철회" 가능). 연방순회항소법원 항소 여부 `[미확인]` | [A&M 해설](https://www.alvarezandmarsal.com/thought-leadership/uscit-upholds-ieepa-suspension-of-de-minimis-treatment-in-axle-of-dearborn) `[2차]` |
| **2027-07-01** | **법률상 면세 폐지 발효.** 행정명령이나 판결과 무관 | OBBBA `[2차]` |

**판단:**
- 2027-07 전까지는 행정 조치에 걸린 소송이 뒤집힐 여지가 이론상 있다. 하지만 CIT가 이미 합법 판결을 냈다.
- 2027-07 이후에는 법이 바뀌므로 상업 화물 면세는 돌아오지 않는다.
- **"$800 면세 부활"에 대비할 실익은 사실상 없다.** `[가설]`

---

## 2. 지금 한국산 소포에 붙는 관세 `[1차]`

### 2.1 Section 301 강제노동 관세 (2026-07-24~)
USTR 원문, Korea 조항(§49)과 HTS 9903.05.70–.71:
> "for a product of South Korea, where such product's MFN tariff is less than 12.5 percent, the sum of the MFN tariff and the Section 301 tariff shall be 12.5 percent, and where such product's MFN tariff is greater than or equal to 12.5 percent, the Section 301 tariff applied shall be zero."

- **공식:** 실효 관세율 = max(기본관세(column 1), 12.5%)
- **KORUS FTA:** KORUS를 적용해 column 1-Special로 신고해도, 기본관세가 12.5% 미만이면 합계 12.5%까지 채워진다.
  - 원문은 "column 1-Special"을 명시적으로 다룬다(note 52(k)).
  - **결국 KORUS가 관세를 0%로 만들어 주지 못한다.** `[1차, 해석은 관세사 확인 권장]`
- **예외 (HTS 9903.05.85–.92 등):**
  - 9903.05.92 정보 간행물: "publications, films, posters, phonograph records, photographs, … tapes, **compact disks**, CD ROMs, artworks"
  - 기부품, 동반 수하물 개인 사용품, Section 232 대상품, Annex I·II 품목

### 2.2 IEEPA·Section 122
- IEEPA 상호관세(한국 15%)는 2026-02-20 대법원 판결로 종료됐다.
- Section 122 10%는 2026-07-24 만료됐다.
- **둘 다 지금은 적용되지 않는다.** `[1차·2차]`
- Deep Research 1차 실행본이 언급한 "IEEPA informational materials 예외"는 이제 IEEPA 관세가 없으므로 의미가 없다. 같은 취지의 예외가 Section 301(9903.05.92)에 들어 있다.

### 2.3 수수료
- MPF(간이통관 Type 11, 자동): FY2026 **$2.69** `[2차: CBP 표 인용]`
- 우편 통관은 MPF가 면제된다 (19 CFR 24.23(c)(1)(v)) `[1차]`
- 특송사 통관 대행 수수료: 운송사마다 다름 `[미확인 — 계약 견적 필요]`

### 2.4 계산 예시 (관세만, 운송사 수수료 제외) `[1차 규칙 적용, 분류는 가설]`

| 상품 | HTS(추정) | 기본관세 | Section 301 | 실효 관세 | 금액 |
|---|---|---|---|---|---|
| (a) 한국산 화장품 $50 | 3304.99 | 0% | +12.5% | 12.5% | $6.25 |
| (b) K-pop 앨범 $40 (CD+포토북) | 8523.49 / 4901 | 0% | **예외** (9903.05.92) | 0% | $0 |
| (c) 한국산 면 티셔츠 $150 — KORUS 미신고 | 6109.10 | 16.5% | 0% (이미 12.5% 이상) | 16.5% | $24.75 |
| (c') 같은 상품 — **KORUS 신고** | 6109.10 | 0% (column 1-Special) | +12.5% (top-up) | 12.5% | **$18.75** |
| (d) 한국 쇼핑몰이 파는 중국산 액세서리 $60 | 7117 등 | 품목별 | **중국 원산지 적용** (중국 301·232 등) | 품목별, 높음 | `[미확인]` |

- **KORUS 신고 규칙:**
  - 기본관세가 12.5%를 넘는 품목(의류 등)은 KORUS를 신고하면 실효 관세가 12.5%로 내려간다. 신고할 가치가 있다.
  - 기본관세가 12.5% 이하인 품목(화장품 등)은 신고해도 결과가 같다.
  - KORUS 신고에는 원산지 입증 자료 보관 의무(5년)가 따른다 `[DR, 관세사 확인]`.
- 원산지는 판매처가 아니라 **제조국** 기준이다. 한국 쇼핑몰에서 사도 중국산이면 중국 관세가 붙는다.
- 응원봉처럼 앨범과 배터리 제품이 같이 든 묶음은 품목별로 나눠 분류해야 한다. 예외 적용은 정보 간행물 부분에만 된다. `[가설]`

---

## 3. 우편(EMS) vs 특송 `[1차]`

- **우편:**
  - 2026-07-24부터 새 "postal informal entry"를 쓴다.
  - 하지만 이 절차는 "goods subject to Section 201, Section 232, or Section 301 duties … AD/CVD … PGA data requirements"를 **받지 않는다** (FR 2026-12669).
  - 한국산은 대부분 Section 301 대상이다. 그래서 우편으로 보내면 다른 통관 방식(브로커 경유)을 써야 하고, 비용과 서류가 늘어난다.
  - 정보 간행물(앨범)처럼 301 예외인 품목은 예외일 수 있다. `[가설]`
- **특송(DHL/FedEx/UPS, 포워더):**
  - $2,500 이하는 간이통관 Type 11로 처리한다.
  - DDP로 운송사가 관세를 대납하고 청구하는 방식이 표준이다.
  - **→ PayNShip 미국 출시는 특송 DDP를 기본 경로로 둔다.**
- 우정사업본부는 2025-09-22 미국행을 관세 선납 방식으로 재개했다. 하지만 2026-07-24 새 규칙 이후 한국산 일반 물품을 어떻게 처리하는지 공지는 `[미확인]`이다.

---

## 3.5 "개인 쇼핑" 물품도 과세되는가 `[1차]`

- **수입이 금지된 것은 아니다.** $800 이하 면세 혜택만 정지됐다.
- §1321(a)(2) 세 갈래 중 **(C) $800 일반 면세만 정지**됐다.
  - (C)는 구매자가 개인인지 사업자인지 가리지 않는다.
  - 따라서 **개인이 해외 쇼핑몰이나 구매대행으로 산 물건도 과세**된다.
- **유지되는 것:**
  - (A) 해외 거주자가 보내는 진짜 선물, $100 이하
  - (B) 입국자가 직접 들고 오는 개인·가정용 물품, $200 이하
  - 원문: "This rule does not suspend the exemptions for bona fide gifts under 19 U.S.C. 1321(a)(2)(A) or personal or household articles accompanying travelers under 19 U.S.C. 1321(a)(2)(B)." (FR 2026-12670)
- **PayNShip 주문은 선물이 아니다.** 고객이 결제한 구매품을 대신 사서 보내는 것이기 때문이다.
  - 선물로 신고하면 허위 신고다.
  - OBBBA는 de minimis 악용 시 민사 벌금을 규정한다: 최대 $5,000(초범), $10,000(재범) `[2차]`.
  - → **운영 정책: 고객이 요청해도 "gift" 신고는 금지.**

---

## 4. PayNShip 견적 엔진 설정 권고

| 항목 | 권고 | 비고 |
|---|---|---|
| 미국 면세 모델 | **`none` (면세 없음)** | B 현재 값 그대로 |
| 면세 "구조" | **유지.** 국가별 모델을 DB 설정으로 관리 (B `CountryCustoms.deMinimisModel`) | JP·EU·AU·CA에 필요 |
| 한국산 관세율 | **실효 = max(기본관세, 12.5%)**, 단 9903.05.85–.92 예외는 기본관세만 | B 관세 테이블에 "301 하한" 규칙 추가 필요 `[실측: 미구현]` |
| 정보 간행물 예외 | 앨범·CD·포토북·포스터는 301 제외 | K-pop 핵심. HS 분류 정확도가 마진을 좌우 |
| 원산지 | **제조국 기준.** 판매처 국가가 아님 | 추출 단계에서 원산지 필드 필수 (B는 이미 originIso2 있음) |
| 통관 수수료 | 특송사 계약 수수료를 견적 항목으로 둔다. MPF $2.69 반영 | 운송 계약 후 확정 |
| 배송 경로 | 미국은 특송 DDP 기본, 우편은 앨범 등 예외 품목만 검토 | |
| 갱신 체계 | 관세 규칙을 코드가 아니라 DB 테이블과 날짜 유효기간으로 관리 | 2026년에만 규칙이 4번 바뀜 |

**머지 계획 S5 반영안:**
- 결정: "$800 면세 **구조**는 유지(국가별 설정), **미국 값은 '면세 없음'**".
- 추가 작업: M2에 "한국산 Section 301 하한(12.5%) + 정보 간행물 예외" 규칙을 추가한다.
- 출시 전에 관세사 확인 1회를 받는다.

---

## 5. Deep Research 결과에 대한 검증 메모

| DR 주장 | 검증 |
|---|---|
| "$800 유지 의견은 현행법 위배" | ✅ 1차로 확인 |
| "EO 14388 존재" (B 문서 인용) | ✅ 실재 (2026-02-20) |
| "Section 301 12.5% 한국 Capped" | ✅ 실재. 정확히는 "기본관세 합계 12.5% 하한(top-up)" |
| "HTS 9903.05.92 정보 간행물 예외" | ✅ 원문 확인 |
| "KORUS로 0% 세팅 + MPF 면제 로직" | ⚠️ **부분 오류.** KORUS를 적용해도 301 top-up으로 12.5%가 된다(column 1-Special 명시). MPF 면제는 KORUS 원산지에 해당 `[미확인: CBP MPF 표 확인 필요]` |
| "중국산 최소 22.5%" | `[미확인]`. 품목·조치별로 달라 단일 숫자는 쓰지 않는다 |
| "특송 통관 수수료 $15~25" | `[미확인]`. 운송사 계약 견적으로 확정한다 |
| 1차 실행 보고서 1~4장 | 러너가 마지막 블록만 저장해서 유실. 2차 실행으로 전체 확보 (`references/`) |
| **2차 실행:** "한국산에 Section 301 **10%**가 MFN 위에 중첩" | ❌ **오류.** USTR 원문은 한국에 "MFN 합계 **12.5%** top-up"(9903.05.71)이다. 10%는 EU·대만 등급이다. 그래서 DR 2차의 계산 예시(화장품 $5, 의류 $15)는 모두 틀렸다. 이 문서 §2.4가 정정본이다 |
| 2차: "우편 종량세 옵션 2026-02-28 영구 종료" | ⚠️ **불일치.** FR 2026-12669는 EO 14388이 우편 세율을 "Section 122 만료 또는 새 우편 통관 시행 중 이른 날"(=2026-07-24)까지 유지했다고 적는다. 또 실제 신고자는 모두 종가세를 택했다고 적는다 |
| 2차: 정보 간행물 예외 근거 = 50 U.S.C. §1702(b)(3) | ⚠️ 결론은 맞지만 근거가 다르다. §1702(b)는 IEEPA 예외다. Section 301에서는 USTR 조치의 HTS 9903.05.92가 근거다 |
| 2차: 2025-11 한미 협정·쿠팡 분쟁·232 위협 | `[미확인]` 이번 판단에는 쓰지 않음 |
| 2차: 시장 동향 (소포 75% 감소, 위버스 2026-02 DDP 전환, 올리브영 미국 물류센터, Ktown4u 배송비 7% 인상, ACE 분할주문 합산) | `[DR, 미확인]` 경쟁 분석 참고용으로만 쓴다 |
| 2차: 2027 이후에도 $100 선물 면세 유지 | ✅ (A)는 정지 대상이 아님(FR 2026-12670). OBBBA 폐지 범위는 상업용 (C) `[2차]` |
| 실행 비용 | 2회 실행. 2차 실행 사용량: 입력 1.34M 토큰, 출력 54.6K 토큰, thinking 121K 토큰, Google 검색 121회. Max 단가는 `[미조사]` |

## 출처 (1차)
- EO 14324 (2025-07-30): https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/
- CBP fact sheet (2025-08-18): https://www.cbp.gov/sites/default/files/2025-08/factsheet_suspension_of_duty-free_de_minimis_treatment.pdf
- EO 14388 (2026-02-20): https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/
- CRS LSB11398 (대법원 IEEPA 판결): https://www.congress.gov/crs-product/LSB11398
- FR 2026-12670 (우편 외 경로, 2026-06-24 시행): https://www.federalregister.gov/documents/2026/06/24/2026-12670/
- FR 2026-12669 (우편, 2026-07-24 시행): https://www.federalregister.gov/documents/2026/06/24/2026-12669/
- USTR Section 301 Final Action (2026-07-23): https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf

## 출처 (2차)
- OBBBA 2027-07-01 폐지: https://www.supplychaindive.com/news/de-minimis-ends-trump-big-beautiful-bill/751935/ · https://www.beneschlaw.com/insight/customs-de-minimis-ending-in-2027-big-beautiful-bill-impact-analysis-for-supply-chains/
- CIT *Axle of Dearborn* (2026-08-13): https://www.alvarezandmarsal.com/thought-leadership/uscit-upholds-ieepa-suspension-of-de-minimis-treatment-in-axle-of-dearborn
- Section 122 → 301 전환: https://globaltradealert.org/blog/from-ieepa-to-section-122 · https://www.hklaw.com/en/insights/publications/2026/07/and-the-tariff-beat-goes-on
- 우정사업본부 미국행 재개 (2025-09-22): https://www.klnews.co.kr/news/articleView.html?idxno=318158
- MPF FY2026: https://www.federalregister.gov/documents/2025/07/23/2025-13869/customs-user-fees-to-be-adjusted-for-inflation-in-fiscal-year-2026-cbp-dec-25-10
