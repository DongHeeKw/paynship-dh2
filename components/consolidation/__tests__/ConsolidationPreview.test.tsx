import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ConsolidationPreview from '../ConsolidationPreview';

describe('white-orange consolidation preview', () => {
  it('uses benefit-first Korean copy, rather than generic consolidation recommendations', () => {
    const html = renderToStaticMarkup(<ConsolidationPreview />);
    expect(html).toContain('함께 배송하면 8,000원 아낄 수 있어요');
    expect(html).not.toContain('합배송을 추천합니다');
  });

  it('makes delayed dispatch and separate shipping visible', () => {
    const html = renderToStaticMarkup(<ConsolidationPreview />);
    expect(html).toContain('3일 더 기다려야 해요');
    expect(html).toContain('함께 배송 선택하기');
    expect(html).toContain('각각 배송할게요');
  });

  it('marks sample data clearly and does not claim real delivery or taxes', () => {
    const html = renderToStaticMarkup(<ConsolidationPreview />);
    expect(html).toContain('시안용 가상 상품·가격·일정입니다');
    expect(html).toContain('통관·DDP 실검증');
    expect(html).toContain('실제 주문·운임·관세·DDP 또는 배송 완료를 의미하지 않습니다');
  });

  it('provides accessible navigation for switching to the operator preview', () => {
    const html = renderToStaticMarkup(<ConsolidationPreview />);
    expect(html).toContain('aria-label="시안 화면 전환"');
    expect(html).toContain('자택 운영 화면');
    expect(html).toContain('aria-current="page"');
  });
});
