/**
 * Classifier Module
 *
 * HS Code and customs classification utilities
 *
 * @module lib/classifier
 */

// Material → HS Code mapping
export {
  refineHSCodeByMaterial,
  extractMaterialComposition,
  getDominantMaterial,
  isMaterialRelevantForCategory,
  type MaterialHSMapping,
  type MaterialRefinementResult,
} from './material-hs-mapper';

// Origin → FTA lookup
export {
  getFTARate,
  normalizeOrigin,
  getApplicableFTA,
  hasFTAWithKorea,
  getFTARequirements,
  KOREA_FTA_AGREEMENTS,
  COUNTRY_INFO,
  type FTARateResult,
  type CountryInfo,
} from './origin-fta-lookup';
