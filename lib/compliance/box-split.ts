/**
 * 박스 분리 로직 (v2.0 Consolidation_Compliance ADR).
 *
 * 규칙:
 *   1. DG (dgClass != null) → 'DG' 박스 (다른 일반 화물과 분리)
 *   2. 검역 (quarantine=true) → 'QUARANTINE' 박스
 *   3. 일반 화물은 HS prefix 6자리 단위로 그룹 (다른 prefix면 분리)
 *
 * 운영자가 박스를 다시 합칠 수는 있으나, 시스템은 분리를 디폴트로 함.
 */

import { ComplianceItem, ComplianceBox, ComplianceWarning } from './types';

export function splitIntoBoxes(items: ComplianceItem[]): {
  boxes: ComplianceBox[];
  warnings: ComplianceWarning[];
} {
  const warnings: ComplianceWarning[] = [];
  const dgItems: ComplianceItem[] = [];
  const quarantineItems: ComplianceItem[] = [];
  const generalByPrefix = new Map<string, ComplianceItem[]>();
  const missingHsLines: string[] = [];

  for (const item of items) {
    if (item.dgClass) {
      dgItems.push(item);
      continue;
    }
    if (item.quarantine) {
      quarantineItems.push(item);
      continue;
    }
    if (!item.hsCode) {
      missingHsLines.push(item.lineId);
      // HS 없는 라인은 'UNKNOWN' prefix bucket
      pushGroup(generalByPrefix, 'UNKNOWN', item);
      continue;
    }
    const prefix = item.hsCode.replace(/\./g, '').slice(0, 6);
    pushGroup(generalByPrefix, prefix, item);
  }

  if (missingHsLines.length > 0) {
    warnings.push({
      code: 'MISSING_HS',
      message: `HS 코드가 없는 라인 ${missingHsLines.length}건 — 운영자 검토 필요`,
      affectedLineIds: missingHsLines,
    });
  }

  const boxes: ComplianceBox[] = [];

  if (dgItems.length > 0) {
    boxes.push(buildBox('box-dg', 'DG', null, dgItems));
    warnings.push({
      code: 'DG_BOX_SPLIT',
      message: `위험물(DG) ${dgItems.length}건 — 별도 박스 + 추가 비용 발생`,
      affectedLineIds: dgItems.map(i => i.lineId),
    });
  }

  if (quarantineItems.length > 0) {
    boxes.push(buildBox('box-quarantine', 'QUARANTINE', null, quarantineItems));
    warnings.push({
      code: 'QUARANTINE_BOX_SPLIT',
      message: `검역 대상 ${quarantineItems.length}건 — 별도 박스 + 통관 지연 가능`,
      affectedLineIds: quarantineItems.map(i => i.lineId),
    });
  }

  let prefixIdx = 1;
  for (const [prefix, group] of generalByPrefix) {
    const boxId = `box-${prefixIdx++}`;
    boxes.push(buildBox(boxId, 'GENERAL', prefix === 'UNKNOWN' ? null : prefix, group));
  }

  // HS 라인 분리 경고 (일반 박스 ≥ 2개)
  const generalBoxCount = boxes.filter(b => b.type === 'GENERAL').length;
  if (generalBoxCount >= 2) {
    warnings.push({
      code: 'HS_LINE_SPLIT',
      message: `서로 다른 HS 코드 ${generalBoxCount}개 — 박스 분리 (DDP 라인별 계산)`,
      affectedLineIds: items
        .filter(i => !i.dgClass && !i.quarantine)
        .map(i => i.lineId),
    });
  }

  return { boxes, warnings };
}

function pushGroup(map: Map<string, ComplianceItem[]>, key: string, item: ComplianceItem) {
  const list = map.get(key) ?? [];
  list.push(item);
  map.set(key, list);
}

function buildBox(
  boxId: string,
  type: ComplianceBox['type'],
  hsPrefix: string | null,
  items: ComplianceItem[],
): ComplianceBox {
  let totalUsd = 0;
  let totalWeightKg = 0;
  for (const i of items) {
    totalUsd += i.unitPriceUsd * i.quantity;
    if (i.weightKg) totalWeightKg += i.weightKg * i.quantity;
  }
  return {
    boxId,
    type,
    hsPrefix,
    lineIds: items.map(i => i.lineId),
    totalUsd: round2(totalUsd),
    totalWeightKg: round2(totalWeightKg),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
