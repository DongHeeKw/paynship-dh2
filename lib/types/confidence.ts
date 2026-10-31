/**
 * Confidence Type System
 *
 * 추출된 데이터의 신뢰도를 추적하는 시스템
 * 추정값 vs 실제 추출값을 구분하여 Deep Extraction 필요 여부 결정
 */

// ============================================================================
// Extraction Source Types
// ============================================================================

/**
 * 데이터 추출 소스
 */
export type ExtractionSource =
  | 'extracted'     // 페이지에서 직접 추출
  | 'vision'        // 이미지에서 OCR/Vision 추출
  | 'enriched'      // Tavily 등 외부 소스로 보강
  | 'estimated'     // 카테고리 기반 추정값
  | 'unknown';      // 알 수 없음

/**
 * 신뢰도 레벨
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'estimated';

// ============================================================================
// Field Confidence Types
// ============================================================================

/**
 * 개별 필드의 신뢰도 정보
 */
export interface FieldConfidence<T> {
  value: T;
  source: ExtractionSource;
  confidence: number;        // 0.0 ~ 1.0
  level: ConfidenceLevel;
  extractedFrom?: string;    // 추출 위치 (e.g., "상품정보 탭", "이미지 OCR")
}

/**
 * 무게 필드 신뢰도 (배송료 계산 핵심)
 */
export interface WeightConfidence extends FieldConfidence<number> {
  unit: 'kg' | 'g' | 'lb';
  isVolumetric?: boolean;    // 부피 무게 여부
  volumetricWeight?: number; // 부피 무게 (L x W x H / 5000)
}

/**
 * HS Code 필드 신뢰도 (관세 계산 핵심)
 */
export interface HSCodeConfidence extends FieldConfidence<string> {
  chapter?: string;          // HS Code 장 (첫 2자리)
  heading?: string;          // HS Code 호 (첫 4자리)
  subheading?: string;       // HS Code 소호 (첫 6자리)
  description?: string;      // HS Code 품명
}

/**
 * 원산지 필드 신뢰도
 */
export interface OriginConfidence extends FieldConfidence<string> {
  countryCode?: string;      // ISO 3166-1 alpha-2 (e.g., "KR")
  isMadeInKorea?: boolean;   // 한국산 여부 (관세 혜택)
}

// ============================================================================
// Product Confidence Aggregate
// ============================================================================

/**
 * 상품 전체의 신뢰도 정보
 */
export interface ProductConfidence {
  /** 전체 신뢰도 점수 (0.0 ~ 1.0) */
  overallScore: number;

  /** 전체 신뢰도 레벨 */
  overallLevel: ConfidenceLevel;

  /** 주요 필드별 신뢰도 */
  fields: {
    name: FieldConfidence<string>;
    price: FieldConfidence<number>;
    weight: WeightConfidence;
    hsCode: HSCodeConfidence;
    origin: OriginConfidence;
    dimensions?: FieldConfidence<{ l: number; w: number; h: number }>;
    material?: FieldConfidence<string>;
  };

  /** Stage 2 Deep Extraction 필요 여부 */
  needsDeepExtraction: boolean;

  /** Deep Extraction이 필요한 이유 */
  deepExtractionReasons: string[];

  /** 추출 메타데이터 */
  metadata: {
    extractedAt: Date;
    stageCompleted: 1 | 2;
    totalExtractionTimeMs: number;
  };
}

// ============================================================================
// Confidence Utilities
// ============================================================================

/**
 * 신뢰도 레벨 계산
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  if (confidence >= 0.5) return 'low';
  return 'estimated';
}

/**
 * 추출 소스별 기본 신뢰도
 */
export function getSourceConfidence(source: ExtractionSource): number {
  switch (source) {
    case 'extracted': return 0.95;
    case 'vision': return 0.85;
    case 'enriched': return 0.80;
    case 'estimated': return 0.30;
    case 'unknown': return 0.10;
    default: return 0.10;
  }
}

/**
 * 추정값 필드 생성 헬퍼
 */
export function createEstimatedField<T>(value: T): FieldConfidence<T> {
  return {
    value,
    source: 'estimated',
    confidence: 0.30,
    level: 'estimated',
  };
}

/**
 * 추출된 필드 생성 헬퍼
 */
export function createExtractedField<T>(
  value: T,
  extractedFrom?: string
): FieldConfidence<T> {
  return {
    value,
    source: 'extracted',
    confidence: 0.95,
    level: 'high',
    extractedFrom,
  };
}

/**
 * Vision 추출 필드 생성 헬퍼
 */
export function createVisionField<T>(
  value: T,
  extractedFrom: string
): FieldConfidence<T> {
  return {
    value,
    source: 'vision',
    confidence: 0.85,
    level: 'high',
    extractedFrom,
  };
}

// ============================================================================
// Deep Extraction Decision
// ============================================================================

/**
 * Stage 2 Deep Extraction이 필요한지 판단
 *
 * 조건 (Option B - 비용 최적화):
 * 1. 무게가 추정값인 경우
 * 2. HS Code가 추정값인 경우
 * 3. 원산지가 없거나 추정값인 경우
 */
export function shouldTriggerDeepExtraction(
  confidence: Partial<ProductConfidence>
): { needed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 무게 체크
  const weight = confidence.fields?.weight;
  if (!weight || weight.source === 'estimated') {
    reasons.push('무게 정보가 추정값입니다 (배송료 정확도 영향)');
  }

  // HS Code 체크
  const hsCode = confidence.fields?.hsCode;
  if (!hsCode || hsCode.source === 'estimated') {
    reasons.push('HS Code가 추정값입니다 (관세 정확도 영향)');
  }

  // 원산지 체크
  const origin = confidence.fields?.origin;
  if (!origin || origin.source === 'estimated' || origin.source === 'unknown') {
    reasons.push('원산지 정보가 없습니다');
  }

  return {
    needed: reasons.length > 0,
    reasons,
  };
}

/**
 * 전체 신뢰도 점수 계산
 */
export function calculateOverallConfidence(
  fields: ProductConfidence['fields']
): { score: number; level: ConfidenceLevel } {
  // 가중치: 무게(0.35), HS Code(0.25), 원산지(0.15), 가격(0.15), 이름(0.10)
  const weights = {
    weight: 0.35,
    hsCode: 0.25,
    origin: 0.15,
    price: 0.15,
    name: 0.10,
  };

  let totalScore = 0;
  totalScore += fields.name.confidence * weights.name;
  totalScore += fields.price.confidence * weights.price;
  totalScore += fields.weight.confidence * weights.weight;
  totalScore += fields.hsCode.confidence * weights.hsCode;
  totalScore += fields.origin.confidence * weights.origin;

  return {
    score: totalScore,
    level: getConfidenceLevel(totalScore),
  };
}

// Types are already exported via their declarations above
