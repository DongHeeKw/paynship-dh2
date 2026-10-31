# HS Code 혼재 합배송 통관 규정 딥리서치 (2026-04)

> **조사 목적**: 한국발 buying agent 모델에서 다품목(다 HS Code · 다 원산지)을 한 박스로 합배송할 때 법적·실무적 제약 확인
> **조사일**: 2026-04-15
> **소스**: Gemini Pro Deep Research
> **원본**: `합배송 박스 통관 규정 조사.md` (사내 제공)

---

## Executive Summary

- **물리적 박스 분리는 법적 의무 아님** — HS Code 혼재 자체는 출발국(KR) · 도착국 · 캐리어 모두 허용
- 단, **commercial invoice 라인 단위 완전 분리**가 필수 (라인 뭉뚱그리기 금지)
- **2026년 최대 리스크**: 미국 Section 321 de minimis 전면 중단 + EU €3 per HS heading 과세
- **DG(위험물) · 검역 대상은 물리적 박스 분리 의무** (IATA · 위생 규정)
- **저가신고(Undervaluation) 탐지 로직**이 신뢰성의 핵심

---

## 1. 한국(출발국) 측 — ✅ 혼재 가능

| 항목 | 결론 |
|------|------|
| 단일 House AWB/EDI 내 다 HS Code 허용 | ✅ 허용 |
| 박스 물리 분리 요구 | ❌ 불요 (라인 분리만) |
| 간이수출 한도 | 2M → **4M 원**으로 상향 (약 $2,000~3,000) |
| EDI 누락 시 리스크 | 통관 지연 · 특송사 포괄담보 오염 |

**Impl**: 출발국 단에서는 invoice 라인 완결성만 보장하면 됨.

## 2. 도착국별 2026년 과세 기준

| 국가 | 면세 한도 | 과세 단위 | 2026 변경 |
|------|----------|----------|----------|
| 🇺🇸 미국 | **없음** | per item (Formal Entry) | Section 321 전면 중단 (EO 14388, '26.02) |
| 🇯🇵 일본 | ¥10,000 | **per parcel** | 박스 합산 초과 시 전체 과세 |
| 🇪🇺 EU/🇬🇧 UK | €150 폐지 | **per HS tariff heading × €3** | '26.07부터 heading별 누적 |
| 🇨🇦 캐나다 | CAD 20/40 (CLVS CAD 3,300) | per line (CAD 양식) | CARM 전면 의무 (라인 합치기 금지) |
| 🇦🇺 호주 | AUD 1,000 | per consignment | 변동 없음 |

**핵심 변화**:
- **US**: 1달러짜리 품목도 Formal Entry + 관세 — 합배송 비용 효율성 붕괴
- **EU**: 다품목일수록 관세 누적 → **동일 HS heading으로 묶는 전략** 필요
- **JP**: 박스 단위 ¥10,000 임계 → 분할 발송이 유리한 경우 다수

## 3. 물리적 분리 강제 케이스 (DG · 검역)

| 카테고리 | 분리 근거 |
|----------|----------|
| 리튬 배터리 · 향수 · 네일리무버 · 스프레이캔 | IATA DGR (Class 3/4/5/8) |
| 액체/고체 DG 혼재 | 별도 UN 박스 + DG 마킹 필수 |
| 식품 · 건강기능식품 · 화장품 · 의약품 | FDA/PMDA 사전승인 Hold 리스크 → 일반 공산품과 분리 권장 |
| 고가품 (현금성, 귀금속) | 캐리어 약관상 혼재 금지 |

## 4. FTA 원산지 증명 — ✅ 혼재 박스 허용

- **발급 단위**: 송장(Per Invoice) — 인보이스 한 장에 KR/CN/VN 혼재 가능
- **특혜 적용**: **라인별(Per Line Item)** — KR 표기 라인만 FTA 적용, CN 라인은 MFN 관세
- **리스크**: 포괄 문구(`All items KR origin`) 기재 시 실사에서 오리진 불일치 발견되면 **박스 전체 FTA 박탈 + 벌금**

**Impl**: 라인별 원산지 필드를 DB에 보관하고 인보이스 PDF에 각 라인별 origin 명시.

## 5. 캐리어 실무 — ✅ Multi-HS 완전 지원

- DHL, FedEx, UPS, Asendia, Aramex, EMS 모두 multi-line item 지원
- UPS WorldShip: 1 shipment당 최대 **1,000개 라인** 지원
- Paperless Invoice (EDI) 자동 전송 → 종이 invoice 불요
- **EAD(Electronic Advance Data) 사전제출 의무 강화** — 라인 누락 시 공항 Off-load

## 6. paynship 적용 운영 규칙 (5개)

1. **Invoice 자동 라인 분리 + 다원산지 개별 매핑 의무화**
   - DB 스키마에 `lineItems[]` 배열 + `{hsCode, origin, unitPrice, quantity, description}` 필수
   - 캐리어 API로 전송 시 Multi-line array 형태로 paperless EDI 송출
2. **2026 동적 Duty Calculator 내장 (DDP 제공)**
   - 국가별 2026 규칙 하드코딩: US no-de-minimis, EU €3/heading, JP ¥10,000/parcel, CA per-line, AU per-consignment
   - Checkout 단계에서 사전 관세 징수(DDP)로 수취 거부(RTS) 리스크 차단
3. **스마트 격리 알고리즘 — DG/검역 자동 분리**
   - 상품 카탈로그에 `dgClass`, `inspectionRequired` 플래그
   - Cart에 혼재 감지 시 "2개 이상 박스로 자동 분할 발송" 안내 강제 실행
4. **조건부 FTA 원산지 증명 렌더링**
   - invoice PDF 템플릿에서 `origin=KR` 라인만 FTA 증명문구 조건부 출력
   - `All items KR origin` 같은 포괄 문구 시스템적 차단
5. **저가신고 모니터링 Lock**
   - 시장 평균가 대비 비정상적 낮은 단가(예: 노트북 $5) 탐지 → 라벨 자동출력 중지 · 관리자 승인 단계(Pending)로 회부

---

## 출처 (주요)

- [US CBP — Section 321 suspension EO 14388](https://www.federalregister.gov/documents/2026/04/09/R1-2026-03829/)
- [EU €3 flat duty per item (2026.07~)](https://www.vatupdate.com/2026/01/17/eu-introduces-flat-eur-3-customs-duty-per-item-for-low-value-imports-from-july-2026/)
- [Japan Customs — ¥10,000 per parcel](https://www.customs.go.jp/english/c-answer_e/imtsukan/1006_e.htm)
- [CBSA CARM Commercial Accounting Declaration](https://www.cbsa-asfc.gc.ca/publications/dm-md/d17/d17-4-0-eng.html)
- [Australian Border Force — importing by mail](https://www.abf.gov.au/buying-online/importing-by-post-or-mail)
- [관세청 수출신고서 작성요령](https://law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000102070)
- [IATA Lithium Battery Guidance](https://www.iata.org/contentassets/05e6d8742b0047259bf3a700bc9d42b9/lithium-battery-guidance-document.pdf)
- [DHL Commercial Invoice Guide](https://www.dhl.com/discover/en-global/ship-with-dhl/documents-and-customs-advice/commercial-invoice)
- [UPS WorldShip — Multi Goods Grid](https://www.ups.com/worldshiphelp/WSA/ENG/AppHelp/mergedProjects/CORE/INTERNATIONAL/Specify_Goods_Details_on_the_Goods_Grid.htm)
