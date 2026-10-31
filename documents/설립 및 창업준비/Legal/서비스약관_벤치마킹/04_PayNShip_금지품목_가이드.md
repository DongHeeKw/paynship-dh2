# PayNShip 금지 및 제한 품목 가이드 (Prohibited & Restricted Items)

> **Version**: 1.0 (Draft)
> **Last Updated**: 2026-03-08
> **Status**: DRAFT — 법률 검토 필요
> **Reference**: Delivered Korea 금지품목 + IATA/ICAO 국제 배송 규정 + 한국 관세법

---

## Overview (개요)

PayNShip은 국제 항공운송 규정(IATA, ICAO) 및 한국/도착국 법률을 엄격히 준수합니다. 아래 품목은 당사 서비스를 통해 구매 또는 배송이 금지되거나 제한됩니다.

Even if an item is legal in South Korea, it may be restricted or prohibited for international shipping by carrier regulations or the laws of the destination country. PayNShip is not responsible for items confiscated by customs.

---

## Category 1: Absolutely Prohibited (절대 금지)

이 품목은 어떤 상황에서도 구매대행 또는 배송이 불가합니다.

| # | Category | Examples | Reason |
|---|----------|----------|--------|
| 1 | **Weapons & Parts** | Firearms, ammunition, knives (blade > 15cm), crossbows, gun parts | Legal restriction |
| 2 | **Controlled Substances** | Illegal drugs, narcotics, psychotropic substances | Legal restriction |
| 3 | **Counterfeit Goods** | Fake branded products, pirated media, replica goods | IP/Legal violation |
| 4 | **Currency & Securities** | Cash, coins, checks, bonds, gift certificates (physical) | Financial regulation |
| 5 | **Government IDs & Uniforms** | Passports, military uniforms, police badges | Legal restriction |
| 6 | **Hate Propaganda** | Materials inciting violence or hatred against groups | Legal/ethical |
| 7 | **Pornography** | Explicit adult content in physical form | Customs restriction |
| 8 | **Ivory & Protected Species** | Ivory products, endangered animal products | CITES convention |
| 9 | **Human Remains** | Ashes, organs, biological samples | Shipping regulation |

---

## Category 2: Prohibited for Shipping (배송 금지)

구매는 가능하나 국제 배송이 금지되는 품목입니다.

| # | Category | Examples | Notes |
|---|----------|----------|-------|
| 1 | **Hazardous Materials** | Chemicals, paint, adhesives, cleaning agents (bulk) | IATA DG regulations |
| 2 | **Combustible / Flammable** | Lighters, fuel, fireworks, matches | Fire hazard |
| 3 | **Compressed Gas** | Aerosol cans, gas cartridges, CO2 canisters | Pressure risk |
| 4 | **Gasoline & Fuel** | Any petroleum products | Flammable |
| 5 | **Dry Ice** | Solid carbon dioxide | Asphyxiation risk |
| 6 | **Tobacco & E-Cigarettes** | Cigarettes, vaping devices, e-liquid, heated tobacco | Country regulations vary |
| 7 | **Lottery Tickets** | All forms of lottery, scratch cards | Cross-border gambling laws |
| 8 | **Motor Vehicles** | Cars, motorcycles, scooters | Specialized shipping required |
| 9 | **Tactical Equipment** | Body armor, night vision goggles, handcuffs | Export control |

---

## Category 3: Restricted / Conditional (조건부 제한)

조건에 따라 배송이 가능하거나 불가능한 품목입니다. **반드시 사전 문의 필요.**

| # | Category | Condition | Carrier Restriction |
|---|----------|-----------|-------------------|
| 1 | **Batteries** | Embedded in device: OK (제한적). Standalone lithium: **NO** | All carriers restrict loose batteries |
| 2 | **Perfumes & Candles** | Small quantities may be possible via specific carriers | UPS: restricted. FedEx: limited qty |
| 3 | **Medication** | OTC with prescription copy: case-by-case. Prescription drugs: **NO** | Destination country laws vary |
| 4 | **Vitamins & Supplements** | Depends on destination country import rules | US: generally OK. EU/AU: restricted |
| 5 | **Alcohol / Beverages** | Generally prohibited. Some countries allow limited qty | US: **completely prohibited** |
| 6 | **Food (Non-perishable)** | Sealed, commercially packaged: case-by-case | US: **prohibited**. Other: check customs |
| 7 | **Perishable Food** | Requires cold chain — **not supported** | All: prohibited without cold chain |
| 8 | **Animal/Agricultural Products** | Processed products only, with proper documentation | Varies by destination |
| 9 | **Mobile Devices** | Contains lithium battery — shipping method restricted | Air cargo restrictions apply |
| 10 | **Glasses / Sunglasses** | Prescription glasses may require documentation | Generally OK for non-prescription |
| 11 | **Cosmetics (Liquids)** | Limited quantity per package | UPS: liquid shipping restricted |
| 12 | **K-beauty products with ingredients** | Some ingredients restricted in certain countries (e.g., hydroquinone in EU) | Check destination regulations |

---

## Country-Specific Restrictions (국가별 특수 규정)

### United States (미국)
- **Food items**: Completely prohibited (customs disposal + $100 fee risk)
- FDA-regulated items require compliance
- De minimis threshold: $800 (below: no duty)

### European Union (EU)
- CE marking requirements for electronics
- Cosmetics ingredient restrictions (EU Cosmetics Regulation)
- REACH compliance for chemicals
- De minimis varies by country

### Japan (일본)
- Pharmaceutical Affairs Act restrictions on cosmetics/supplements
- Agricultural quarantine for food items
- Limited quantity on perfumes

### Australia (호주)
- Strict biosecurity — food/plant/animal products heavily restricted
- Therapeutic Goods Act for supplements/medications
- Customs declaration required for goods over AUD 1,000

### Other Countries
Please inquire with our support team for specific country regulations before ordering.

---

## What Happens If a Prohibited Item Is Found (금지품목 발견 시)

### At Our Warehouse
1. We will **contact you** to notify about the prohibited item.
2. Options provided:
   - **Return to retailer** (at your expense, subject to retailer's return policy)
   - **Dispose** (disposal fee may apply)
   - **Alternative shipping method** (if applicable)
3. If no response within **14 days**, we reserve the right to dispose of the item.

### During Shipping / At Customs
1. The item may be **confiscated** by customs authorities.
2. **No refund** will be provided for confiscated items.
3. Additional fees (return shipping, penalties) will be charged to the customer.
4. Illegal items will be reported to law enforcement.

---

## AI Agent Safeguards (AI 에이전트 안전장치)

PayNShip의 AI 에이전트는 다음과 같은 자동 안전장치를 갖추고 있습니다:

1. **URL 스크래핑 시**: 상품 카테고리를 자동 분류하여 금지품목 여부를 사전 경고
2. **장바구니 추가 시**: `guardrails.ts`의 배송 제한 검사를 실행하여 금지품목 차단
3. **주문 확인 시**: 도착국별 제한 품목 최종 확인

**단, AI의 자동 분류는 100% 정확하지 않을 수 있으며, 최종 책임은 고객에게 있습니다.**

---

## Contact (문의)

금지품목 관련 문의:
- Chat: 웹사이트 내 AI 에이전트에게 "Is [item] shippable to [country]?" 질문
- Email: [support@paynship.com]

---

*This document is a draft and requires legal review. Prohibited items list may be updated without prior notice.*
