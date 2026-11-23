// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ConsolidationPreview from '../ConsolidationPreview';
afterEach(cleanup);

describe('compiler-driven preview', () => {
  it('recalculates scenarios and clears the previous demo choice', () => {
    render(<ConsolidationPreview />);
    fireEvent.click(screen.getByRole('button', { name: '함께 배송 선택하기' }));
    expect(screen.getByRole('status').textContent).toContain('실제 신청·결제·출고는 진행되지 않았어요');
    fireEvent.change(screen.getByLabelText('계산 시나리오'), { target: { value: 'bulky' } });
    expect(screen.getByRole('heading', { name: '따로 보내는 게 더 유리해요' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: '함께 배송 선택하기' })).toBeNull();
  });
  it('removes savings and proposal actions when evidence is missing', () => {
    render(<ConsolidationPreview />);
    fireEvent.change(screen.getByLabelText('계산 시나리오'), { target: { value: 'missing' } });
    expect(screen.getByRole('heading', { name: '배송비를 확인하고 있어요' })).toBeTruthy();
    expect(screen.queryByText('8,000원')).toBeNull();
    expect(screen.queryByRole('button', { name: '함께 배송 선택하기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '자택 운영 화면' }));
    expect(screen.getAllByText(/상품·포장·노선에 맞는 통관 근거가 필요해요/).length).toBeGreaterThan(0);
  });
  it('shows partial grouping and its calculation in the operator view', () => {
    render(<ConsolidationPreview />);
    fireEvent.change(screen.getByLabelText('계산 시나리오'), { target: { value: 'partial' } });
    fireEvent.click(screen.getByRole('button', { name: '자택 운영 화면' }));
    expect(screen.getByRole('heading', { name: '후보별 계산 근거' })).toBeTruthy();
    expect(screen.getAllByText(/일부 함께 배송/).length).toBeGreaterThan(0);
    expect(screen.getByText(/고객 선택 전에는 기존 출고 계획을 유지/)).toBeTruthy();
  });
});
