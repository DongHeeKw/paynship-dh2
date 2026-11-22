'use client';

import { useState } from 'react';
import { recommendConsolidation, type ConsolidationPlan } from '@/lib/compiler/consolidation/recommend';
import { consolidationCopy } from '@/lib/compiler/consolidation/presentation';
import styles from './ConsolidationPreview.module.css';

const samplePlans: ConsolidationPlan[] = [
  {
    id: 'separate',
    kind: 'SEPARATE',
    recipientKey: 'sample-user:sample-address',
    manifestFingerprint: 'sample-sweater:1|sample-stationery:1',
    customerTotalKrw: 34_000,
    costComponentsVerified: true,
    customsVerified: true,
    carrierRateVerified: true,
    carrierRateExpiresAt: '2099-12-31T00:00:00.000Z',
    legallyEligible: true,
    packageCompatible: true,
    meetsPromisedDelivery: true,
    additionalWaitDays: 0,
    ddpVerified: true,
  },
  {
    id: 'wait-together',
    kind: 'WAIT',
    recipientKey: 'sample-user:sample-address',
    manifestFingerprint: 'sample-sweater:1|sample-stationery:1',
    customerTotalKrw: 26_000,
    costComponentsVerified: true,
    customsVerified: true,
    carrierRateVerified: true,
    carrierRateExpiresAt: '2099-12-31T00:00:00.000Z',
    legallyEligible: true,
    packageCompatible: true,
    meetsPromisedDelivery: true,
    additionalWaitDays: 3,
    ddpVerified: true,
  },
];

const sampleDecision = recommendConsolidation({
  recipientKey: 'sample-user:sample-address',
  baselineSeparatePlanId: 'separate',
  plans: samplePlans,
  nowIso: '2099-01-01T00:00:00.000Z',
  requireDdp: true,
});
const copy = consolidationCopy(sampleDecision);
const money = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className={styles.sectionHeading}><span>{eyebrow}</span><h2>{title}</h2></div>;
}

function SampleNote() {
  return <p className={styles.sampleNotice} role="note">
    <span aria-hidden="true">ⓘ</span> 시안용 가상 상품·가격·일정입니다. 실제 주문·운임·관세·DDP 또는 배송 완료를 의미하지 않습니다.
  </p>;
}

function CustomerView() {
  const [selection, setSelection] = useState<'none' | 'together' | 'separate'>('none');
  const saving = sampleDecision.status === 'RECOMMENDED'
    ? sampleDecision.estimatedCustomerSavingsKrw : 0;
  return <div className={styles.body}>
    <div className={styles.pageIntro}>
      <div>
        <p className={styles.kicker}>MY ORDERS / 배송 방법</p>
        <h1>내 주문을 더 알뜰하게 받아보세요<span className={styles.orangeDot}>.</span></h1>
        <p>한국에서 주문한 상품의 배송비를 비교하고, 원하는 방법을 선택할 수 있어요.</p>
      </div>
      <div className={styles.introIllustration} aria-hidden="true"><span>📦</span><span>↗</span><span>📦</span></div>
    </div>

    <div className={styles.hero}>
      <div className={styles.heroIcon} aria-hidden="true">✦</div>
      <div className={styles.heroCopy}>
        <span className={styles.heroEyebrow}>배송비를 줄이는 방법을 찾았어요</span>
        <h2>{copy.headline}</h2>
        <p>{copy.waiting}. <strong>선택하기 전</strong> 두 가지 방법을 비교해 보세요.</p>
      </div>
      <div className={styles.savingNumber}><small>예상 절감액</small><strong>{money(saving)}</strong><span>가상 비용 비교</span></div>
    </div>

    <div className={styles.customerGrid}>
      <section className={styles.panel}>
        <SectionHeading eyebrow="YOUR ITEMS" title="함께 보낼 수 있는 상품" />
        <div className={styles.item}>
          <div className={styles.itemVisual} aria-hidden="true">👕</div>
          <div className={styles.itemDetails}><strong>니트 스웨터 · 아이보리</strong><span>주문 PN-10234 · 1개</span><small>한국 허브 입고 완료</small></div>
          <span className={styles.statusGood}>입고 완료</span>
        </div>
        <div className={styles.item}>
          <div className={styles.itemVisualWarm} aria-hidden="true">📒</div>
          <div className={styles.itemDetails}><strong>데일리 문구 세트</strong><span>주문 PN-10279 · 1개</span><small>한국 허브 입고 예정</small></div>
          <span className={styles.statusWaiting}>3일 뒤</span>
        </div>
        <div className={styles.timeline}>
          <div><span className={styles.timelineDot} /><strong>상품 A 입고 완료</strong><small>한국 자택 허브</small></div>
          <div><span className={styles.timelineDotActive} /><strong>상품 B 입고 대기</strong><small>약 3일 뒤 도착</small></div>
          <div><span className={styles.timelineDotEmpty} /><strong>함께 포장 후 출고</strong><small>선택하면 진행</small></div>
        </div>
      </section>
      <section className={styles.panel}>
        <SectionHeading eyebrow="SHIPPING OPTIONS" title="배송 방법 비교" />
        <div className={styles.optionRow}>
          <div><strong>각각 배송</strong><p>입고되는 대로 따로 발송해요.</p></div>
          <strong>{money(34_000)}</strong>
        </div>
        <div className={styles.optionRecommended}>
          <div className={styles.optionTitle}><span className={styles.optionBadge}>절약 효과</span><strong>함께 배송</strong></div>
          <div className={styles.optionPrice}><strong>{money(26_000)}</strong><span>{money(8_000)} 절약</span></div>
          <p>상품 B를 기다려 한 박스로 보내요. 첫 상품 출고까지 3일 더 걸려요.</p>
        </div>
        <div className={styles.breakdown}>
          <div><span>국제배송비 비교</span><span>{money(34_000)} → {money(26_000)}</span></div>
          <div><span>추가 대기</span><strong>3일</strong></div>
          <div><span>통관·DDP 실검증</span><span>시안에서는 미연결</span></div>
        </div>
        {selection === 'none' ? <p className={styles.choiceNote}>어떤 방법도 아직 선택되지 않았어요.</p>
          : <p className={styles.choiceNote} role="status">
            {selection === 'together' ? '함께 배송을 선택한 시안입니다. 실제 신청·결제·출고는 진행되지 않았어요.' : '각각 배송을 선택한 시안입니다. 실제 신청·결제·출고는 진행되지 않았어요.'}
          </p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primaryAction} onClick={() => setSelection('together')}>함께 배송 선택하기</button>
          <button type="button" className={styles.secondaryAction} onClick={() => setSelection('separate')}>각각 배송할게요</button>
        </div>
      </section>
    </div>
    <SampleNote />
  </div>;
}

function Metric({ label, value, helper, warn = false }: { label: string; value: string; helper: string; warn?: boolean }) {
  return <div className={styles.metric}><span>{label}</span><strong className={warn ? styles.warningInk : ''}>{value}</strong><small>{helper}</small></div>;
}

function OperatorView() {
  const [filter, setFilter] = useState<'all' | 'ready'>('all');
  return <div className={styles.body}>
    <div className={styles.pageIntro}>
      <div><p className={styles.kicker}>HOME HUB / OPERATOR</p><h1>집에서 시작하는 물류 운영<span className={styles.orangeDot}>.</span></h1><p>오늘 들어오는 택배부터 묶음 배송 제안, 출고까지 한눈에 확인해요.</p></div>
      <div className={styles.introIllustration} aria-hidden="true"><span>🏠</span><span>↗</span><span>📦</span></div>
    </div>
    <div className={styles.metrics}>
      <Metric label="오늘 입고 예정" value="3건" helper="국내 송장 연동 대기" />
      <Metric label="검수할 상품" value="2건" helper="정확한 옵션·수량 확인" />
      <Metric label="배송비 절약 후보" value="2건" helper="고객 동의 필요" />
      <Metric label="확인이 필요한 주문" value="1건" helper="통관 자료 미확인" warn />
    </div>
    <div className={styles.operatorGrid}>
      <section className={styles.panel}>
        <div className={styles.splitHeading}><SectionHeading eyebrow="TODAY'S ARRIVALS" title="오늘 도착할 택배" /><div className={styles.filterTabs} aria-label="입고 표시 필터">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체</button>
          <button type="button" aria-pressed={filter === 'ready'} onClick={() => setFilter('ready')}>검수 대기</button>
        </div></div>
        <div className={styles.tableScroll}>
          <table className={styles.table}><thead><tr><th>국내 택배</th><th>상품</th><th>고객 주문</th><th>상태</th></tr></thead><tbody>
            {(filter === 'all' ? [
              ['CJ대한통운 · 5846-****','니트 스웨터','PN-10234','검수 대기'],
              ['한진 · 5351-****','문구 세트','PN-10279','배송 중'],
              ['우체국 · 2501-****','포스터','PN-10302','배송 중'],
            ] : [['CJ대한통운 · 5846-****','니트 스웨터','PN-10234','검수 대기']]).map((entry) =>
              <tr key={entry[2]}><td>{entry[0]}</td><td><strong>{entry[1]}</strong></td><td>{entry[2]}</td><td><span className={entry[3] === '검수 대기' ? styles.statusWaiting : styles.statusGood}>{entry[3]}</span></td></tr>
            )}
          </tbody></table>
        </div>
      </section>
      <section className={styles.panel}>
        <SectionHeading eyebrow="SMART SUGGESTIONS" title="배송비를 줄일 수 있는 주문" />
        <div className={styles.suggestionCard}>
          <span className={styles.optionBadge}>예상 8,000원 절약</span>
          <strong>PN-10234 + PN-10279</strong>
          <p>같은 해외 배송지 · 첫 상품 3일 더 대기</p>
          <div className={styles.suggestionFooter}><span>추천: 함께 배송</span><span>고객 동의 대기</span></div>
        </div>
        <div className={styles.suggestionCardMuted}>
          <strong>PN-10302</strong>
          <p>개별배송이 더 유리해요. 큰 박스로 묶으면 부피무게가 증가해요.</p>
        </div>
      </section>
    </div>
    <div className={styles.operatorBottom}>
      <section className={styles.panel}>
        <SectionHeading eyebrow="WORKFLOW" title="집에서 하는 출고 작업" />
        <div className={styles.workflowSteps}>{['택배 수령','상품 검수','무게·치수','포장','운송사 인계'].map((step, i) =>
          <div key={step}><span>{i + 1}</span><strong>{step}</strong></div>)}</div>
      </section>
      <section className={styles.warningPanel}><strong>확인이 필요한 주문 1건</strong><p>원산지 및 국가별 통관 정보가 확정되지 않은 예시입니다. 실제 출고는 차단되어야 해요.</p></section>
    </div>
    <SampleNote />
  </div>;
}

export default function ConsolidationPreview() {
  const [view, setView] = useState<'customer' | 'operator'>('customer');
  return <div className={styles.preview}>
    <header className={styles.topBar}>
      <div className={styles.brand}><span className={styles.brandMark}>⬡</span><strong>PayNShip<span className={styles.orangeDot}>.</span></strong><span className={styles.brandDescriptor}>Korea to your door</span></div>
      <nav aria-label="시안 화면 전환" className={styles.viewToggle}>
        <button type="button" aria-current={view === 'customer' ? 'page' : undefined} onClick={() => setView('customer')}>고객 화면</button>
        <button type="button" aria-current={view === 'operator' ? 'page' : undefined} onClick={() => setView('operator')}>자택 운영 화면</button>
      </nav>
      <span className={styles.previewTag}>UI PREVIEW</span>
    </header>
    {view === 'customer' ? <CustomerView /> : <OperatorView />}
  </div>;
}
