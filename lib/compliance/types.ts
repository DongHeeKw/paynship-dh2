/**
 * Compliance Engine — 공통 타입.
 *
 * v2.0 Consolidation_Compliance ADR 기반:
 *   - HS 코드 라인 분리 (박스 단위)
 *   - DG / 검역 격리 (별도 박스)
 *   - FTA 적용 (원산지+목적지+HS prefix)
 *   - Section 321 (미국 $800 이하 DDP 면제)
 *   - EU §3 (2026-07-01 시행, €3 이하 별도 처리 — Verification Hook)
 */

export interface ComplianceItem {
  /** 라인 식별자 (Product.id 또는 CartItem.id) */
  lineId: string;
  hsCode: string | null;
  /** IATA DG class (예: "9", "3"). null = 일반 화물. */
  dgClass: string | null;
  /** 검역 대상 (식품/식물/동물성) */
  quarantine?: boolean;
  /** 원산지 ISO2 (예: "KR") */
  origin: string;
  /** 단가 USD */
  unitPriceUsd: number;
  /** 수량 */
  quantity: number;
  /** 무게 kg (선택) */
  weightKg?: number;
}

export type BoxType = 'GENERAL' | 'DG' | 'QUARANTINE';

export interface ComplianceBox {
  boxId: string;
  type: BoxType;
  /** 동일 HS prefix(6자리) 라인들 */
  hsPrefix: string | null;
  lineIds: string[];
  totalUsd: number;
  totalWeightKg: number;
}

export type DutyAppliedRule =
  | 'SECTION_321_FREE'    // 미국 $800 이하
  | 'EU_SECTION_3_HOOK'   // EU 2026-07 €3 이하
  | 'FTA_PREFERENTIAL'    // KORUS/RCEP 등
  | 'STANDARD'            // 기본 관세율
  | 'NONE';               // 관세 면제 (의무 X)

export interface LineDutyResult {
  lineId: string;
  hsCode: string | null;
  /** USD 기준 부과 관세 */
  dutyUsd: number;
  /** USD 기준 부과 부가세 (VAT/GST) */
  taxUsd: number;
  /** 적용된 규칙 */
  rule: DutyAppliedRule;
  /** FTA 적용 시 이름 */
  ftaName?: string;
  /** Verification 필요 여부 (EU §3 등) */
  verificationRequired: boolean;
}

export interface ComplianceWarning {
  code: 'DG_BOX_SPLIT' | 'QUARANTINE_BOX_SPLIT' | 'HS_LINE_SPLIT' | 'MISSING_HS' | 'EU_VERIFICATION_REQUIRED';
  message: string;
  affectedLineIds: string[];
}

export interface ComplianceCheckResult {
  boxes: ComplianceBox[];
  duties: LineDutyResult[];
  warnings: ComplianceWarning[];
  totalDutyUsd: number;
  totalTaxUsd: number;
  /** 사용자 동의 모달 필요 (DG/검역 박스 분리, EU verification 등) */
  requiresUserConsent: boolean;
}

export interface ComplianceCheckInput {
  items: ComplianceItem[];
  destinationCountry: string; // ISO2
  /** 평가 기준 시각 (FTA 유효 기간 검증용). 기본 = now */
  evaluatedAt?: Date;
}
