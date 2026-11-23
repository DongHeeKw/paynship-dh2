'use client';

import { useMemo, useState } from 'react';
import { compileConsolidation, type Compilation, type PlanEvaluation } from '@/lib/compiler/consolidation/compile';
import { createScenario, scenarios, type Scenario } from '@/lib/compiler/consolidation/fixtures';
import type { CompilerInput } from '@/lib/compiler/consolidation/contracts';
import { consolidationCopy } from '@/lib/compiler/consolidation/presentation';
import styles from './ConsolidationPreview.module.css';

const money = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const kindLabel = { SEPARATE: '각각 배송', ALL: '모두 함께 배송', PARTIAL: '일부 함께 배송', WAIT: '기다렸다 함께 배송' };
const reasons: Record<string, string> = {
  RATE_EXPIRED: '운임이 만료되어 새 견적이 필요해요.', ROUTE_UNAVAILABLE: '이 배송지에서 이용 가능한 노선을 확인해 주세요.',
  DELIVERY_DEADLINE: '약속한 출고·도착 기한을 넘어요.', STORAGE_LIMIT: '최대 보관 기간을 넘어요.',
  MISSING_PACKING: '이 조합의 포장 측정이 필요해요.', INCOMPATIBLE_ITEMS: '함께 포장할 수 없는 상품이에요.',
  PACKING_NOT_MEASURED: '예상 치수로는 절감액을 확정할 수 없어요.', PACKAGE_OUTSIDE_RATE: '박스 크기·무게가 운임 범위를 벗어나요.',
  WAIT_LIMIT: '허용한 추가 대기일을 넘어요.', MISSING_MATCHING_ASSESSMENT: '상품·포장·노선에 맞는 통관 근거가 필요해요.',
  ASSESSMENT_EXPIRED: '통관 근거의 유효기간이 지났어요.', TRADE_NOT_ELIGIBLE: '수입자·통관·DDP 적격성을 확인해 주세요.',
  UNKNOWN_CHARGES: '미확인 관세·세금·통관 비용이 있어요.',
};
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className={styles.sectionHeading}><span>{eyebrow}</span><h2>{title}</h2></div>;
}
function SampleNote() {
  return <p className={styles.sampleNotice} role="note">ⓘ 시안용 가상 상품·가격·일정입니다. 실제 주문·운임·관세·DDP 또는 배송 완료를 의미하지 않습니다.
    입고 예정 상품의 포장 실측도 학습용 가정입니다. 실제로는 입고·포장 후 다시 측정해야 합니다.</p>;
}
function PriceBreakdown({ plan }: { plan: PlanEvaluation }) {
  const sum = (field: 'freightKrw' | 'surchargesKrw' | 'handlingKrw' | 'storageKrw') =>
    plan.packages.reduce((total, parcel) => total + parcel[field], 0);
  if (plan.customerTotalKrw === null || !plan.charges) return null;
  return <dl className={styles.costList}>
    {[
      ['국제 운임', sum('freightKrw')], ['할증·보험·DDP 수수료', sum('surchargesKrw')],
      ['포장·취급', sum('handlingKrw')], ['추가 보관', sum('storageKrw')],
      ['관세', plan.charges.dutyKrw], ['세금', plan.charges.taxKrw], ['통관 수수료', plan.charges.clearanceKrw],
    ].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(Number(amount))}</dd></div>)}
  </dl>;
}
function CustomerView({ input, result }: { input: CompilerInput; result: Compilation }) {
  const [selection, setSelection] = useState<'none' | 'together' | 'separate'>('none');
  const copy = consolidationCopy(result.decision);
  const decision = result.decision.status === 'RECOMMENDED' ? result.decision : null;
  const selected = result.evaluations.find((entry) => entry.id === decision?.recommendedPlanId);
  return <>
    <div className={styles.pageIntro}><div><p className={styles.kicker}>MY ORDERS / 배송 방법</p>
      <h1>내 주문을 더 알뜰하게 받아보세요<span className={styles.orangeDot}>.</span></h1>
      <p>같은 배송지의 주문을 비교해 비용과 기다리는 시간을 함께 알려드려요.</p></div>
      <div className={styles.introIllustration} aria-hidden="true">📦</div></div>
    <div className={styles.hero}>
      <div className={styles.heroIcon} aria-hidden="true">✦</div>
      <div className={styles.heroCopy}><span className={styles.heroEyebrow}>내 주문 배송 비교 · 가상 계산</span>
        <h2>{copy.headline}</h2><p>{copy.waiting || copy.summary}</p></div>
      {copy.savings && <div className={styles.savingNumber}><small>예상 절감액</small><strong>{copy.savings}</strong><span>가상 비용 비교</span></div>}
    </div>
    <div className={styles.customerGrid}>
      <section className={styles.panel}>
        <SectionHeading eyebrow="YOUR ITEMS" title="같은 배송지로 가는 상품" />
        {input.items.map((item) => <div className={styles.item} key={item.id}>
          <div className={styles.itemVisual} aria-hidden="true">{item.id === 'A' ? '👕' : '📒'}</div>
          <div className={styles.itemDetails}><strong>{item.id === 'A' ? '니트 스웨터 · 아이보리' : `데일리 문구 세트 ${item.id}`}</strong>
            <span>주문 {item.orderId} · {item.quantity}개</span><small>{item.exactSku}</small></div>
          <span className={item.state === 'READY' ? styles.statusGood : styles.statusWaiting}>
            {item.state === 'READY' ? '검수 완료' : `${Math.ceil((Date.parse(item.readyAt) - Date.parse(input.nowIso)) / 86400000)}일 뒤 입고 예정`}</span>
        </div>)}
        <div className={styles.timeline}>
          <div><span className={styles.timelineDot} /><strong>입고·검수 확인</strong><small>주문별 상태 확인</small></div>
          <div><span className={styles.timelineDotActive} /><strong>비용·대기 비교</strong><small>지금 보는 단계</small></div>
          <div><span className={styles.timelineDotEmpty} /><strong>고객 선택·재검증</strong><small>실제 출고 미연결</small></div>
        </div>
        <p className={styles.choiceNote}>고객 선택 전에는 기존 출고 계획을 유지합니다. 선택하지 않아도 출고를 임의로 늦추지 않아요.</p>
      </section>
      <section className={styles.panel}>
        <SectionHeading eyebrow="SHIPPING OPTIONS" title="배송 방법 비교" />
        {decision && selected ? <>
          <div className={styles.optionRow}><div><strong>각각 배송</strong><p>각 주문의 기존 출고 일정 기준</p></div><strong>{money(decision.baselineCustomerTotalKrw)}</strong></div>
          <div className={styles.optionRecommended}>
            <div className={styles.optionTitle}><span className={styles.optionBadge}>계산 결과</span><strong>{kindLabel[decision.recommendedKind]}</strong></div>
            <div className={styles.optionPrice}><strong>{money(decision.selectedCustomerTotalKrw)}</strong>{copy.savings && <span>{copy.savings} 절약</span>}</div>
            <p>{selected.groups.map((group) => group.map((id) => `상품 ${id}`).join(' + ')).join(' / ')} · {selected.groups.length}개 박스</p>
            <p>추가 대기 {decision.extraWaitDays}일 · 해외 도착일은 실제 운송사 확인이 필요해요.</p>
          </div>
          <PriceBreakdown plan={selected} />
          <p className={styles.scopeNote}>배송·통관 비교 총액입니다. 이미 결제한 상품·서비스 수수료·국내 운임은 포함하지 않아요.</p>
        </> : <p className={styles.choiceNote}>{copy.summary} 미확인 비용은 0원으로 계산하지 않아요.</p>}
        <div className={styles.breakdown}><div><span>통관·DDP 실검증</span><span>시안에서는 미연결</span></div></div>
        {selection === 'none' ? <p className={styles.choiceNote}>어떤 방법도 아직 선택되지 않았어요.</p> :
          <p className={styles.choiceNote} role="status">{selection === 'together' ? '함께 배송' : '각각 배송'}을 선택한 시안입니다. 실제 신청·결제·출고는 진행되지 않았어요.</p>}
        {decision && <div className={styles.actions}>
          {copy.showConsentAction && <button type="button" className={styles.primaryAction} onClick={() => setSelection('together')}>함께 배송 선택하기</button>}
          <button type="button" className={styles.secondaryAction} onClick={() => setSelection('separate')}>각각 배송할게요</button>
        </div>}
      </section>
    </div>
  </>;
}
function OperatorView({ input, result }: { input: CompilerInput; result: Compilation }) {
  const copy = consolidationCopy(result.decision);
  return <>
    <div className={styles.pageIntro}><div><p className={styles.kicker}>HOME HUB / OPERATOR</p><h1>집에서 시작하는 물류 운영<span className={styles.orangeDot}>.</span></h1>
      <p>주문 구성부터 실측 운임, 통관 근거, 제외 사유까지 계산 과정을 확인해요.</p></div></div>
    <div className={styles.metrics}>
      {[
        ['검수 완료', input.items.filter((item) => item.state === 'READY').length],
        ['입고 예정', input.items.filter((item) => item.state === 'EXPECTED').length],
        ['계산한 후보', result.evaluations.length], ['검토할 후보', result.evaluations.filter((entry) => entry.reasons.length).length],
      ].map(([label, value]) => <div className={styles.metric} key={label}><span>{label}</span><strong>{value}건</strong><small>현재 가상 시나리오 기준</small></div>)}
    </div>
    <section className={styles.panel}><SectionHeading eyebrow="HOME HUB INVENTORY" title="주문별 입고·검수 현황" />
      <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>주문</th><th>정확한 상품 옵션</th><th>수량</th><th>상태</th><th>출고 기한 (UTC)</th></tr></thead>
        <tbody>{input.items.map((item) => <tr key={item.id}><td>{item.orderId}</td><td>{item.exactSku}</td><td>{item.quantity}</td><td>{item.state === 'READY' ? '검수 완료' : '입고 예정'}</td><td>{item.dispatchBy.slice(0, 10)}</td></tr>)}</tbody></table></div>
    </section>
    <div className={styles.suggestionCard}><strong>{copy.headline}</strong><p>{copy.waiting || copy.summary}</p>
      <p>고객 선택 전에는 기존 출고 계획을 유지합니다. 실측 변경 시 근거를 다시 확인하며, 실제 예약·출고는 연결하지 않았어요.</p></div>
    <section className={styles.panel}>
      <SectionHeading eyebrow="DECISION TRACE" title="후보별 계산 근거" />
      <div className={styles.traceGrid}>{result.evaluations.map((plan) => <article className={styles.traceCard} key={plan.id}>
        <h3>{kindLabel[plan.kind]} · {plan.groups.length}개 박스</h3>
        <p>{plan.groups.map((group) => group.join(' + ')).join(' / ')} · 추가 대기 {plan.extraWaitDays}일</p>
        <strong>{plan.customerTotalKrw === null ? '검토 필요' : money(plan.customerTotalKrw)}</strong>
        {plan.reasons.length > 0 && <ul>{plan.reasons.map((reason) => <li key={reason}>{reasons[reason] || reason}</li>)}</ul>}
        <details><summary>박스·비용·근거 보기</summary>
          {plan.packages.map((parcel) => <div className={styles.parcelTrace} key={parcel.measurementRef}>
            <strong>{parcel.itemIds.join(' + ')}</strong><p>실중량 {parcel.actualWeightGrams}g · 부피무게 {parcel.volumetricWeightGrams}g · 과금 {parcel.billableWeightGrams}g</p>
            <p>국제운임 {money(parcel.freightKrw)} + 할증 {money(parcel.surchargesKrw)}</p>
            <p>내부 취급원가 {money(parcel.internalHandlingKrw)} (고객 절감액과 별도)</p>
          </div>)}
          <PriceBreakdown plan={plan} /><p>서비스: {plan.service}</p><p>근거 만료 (UTC): {plan.expiresAt}</p>
          <ul>{plan.evidenceRefs.map((ref) => <li key={ref}>{ref}</li>)}</ul>
        </details>
      </article>)}</div>
    </section>
  </>;
}
export default function ConsolidationPreview() {
  const [view, setView] = useState<'customer' | 'operator'>('customer');
  const [scenario, setScenario] = useState<Scenario>('wait');
  const input = useMemo(() => createScenario(scenario), [scenario]);
  const result = useMemo(() => compileConsolidation(input), [input]);
  return <div className={styles.preview}>
    <header className={styles.topBar}>
      <div className={styles.brand}><span className={styles.brandMark}>⬡</span><strong>PayNShip<span className={styles.orangeDot}>.</span></strong><span className={styles.brandDescriptor}>Korea to your door</span></div>
      <nav aria-label="시안 화면 전환" className={styles.viewToggle}>
        <button type="button" aria-current={view === 'customer' ? 'page' : undefined} onClick={() => setView('customer')}>고객 화면</button>
        <button type="button" aria-current={view === 'operator' ? 'page' : undefined} onClick={() => setView('operator')}>자택 운영 화면</button>
      </nav><span className={styles.previewTag}>COMPILER PREVIEW</span>
    </header>
    <main className={styles.body}>
      <div className={styles.scenarioBar}><label htmlFor="scenario">계산 시나리오</label>
        <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
          {Object.entries(scenarios).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select><span>가상 데이터 · HOME_HUB · 실거래 없음</span></div>
      {view === 'customer' ? <CustomerView key={scenario} input={input} result={result} /> : <OperatorView input={input} result={result} />}
      <SampleNote />
    </main>
  </div>;
}
