// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkspaceData } from '@/features/workspace/core/types';
import { POLICY_REVIEW_DUE_AT } from '@/lib/customs/sources';
import WorkspaceCustoms from '../WorkspaceCustoms';

afterEach(cleanup);
const customer = (country: WorkspaceData['customer']['country']): WorkspaceData['customer'] => ({
  id: `sample-customer-${country.toLowerCase()}`, country, name: 'SAMPLE Customer', email: 'sample@example.invalid', sampleOnly: true,
});

describe('developer customs evidence dates', () => {
  it.each(['CN', 'JP', 'US'] as const)('%s shows overdue guidance at its deadline while keeping sample actions separate', country => {
    render(createElement(WorkspaceCustoms, { data: { customer: customer(country) }, now: Date.parse(POLICY_REVIEW_DUE_AT) }));
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Built-in customs guidance needs review.');
    expect(status.textContent).toContain('2026-11-11 UTC');
    expect(status.textContent).toContain('Fictional workspace actions remain available.');
    expect(screen.getAllByText('Collection blocked by robots policy')).toHaveLength(4);
  });

  it('does not claim the internal deadline passed before it is due', () => {
    render(createElement(WorkspaceCustoms, { data: { customer: customer('JP') }, now: Date.parse(POLICY_REVIEW_DUE_AT) - 1 }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the new live URL check separate from the older rules review', () => {
    render(createElement(WorkspaceCustoms, { data: { customer: customer('US') }, now: Date.parse('2026-11-15T00:00:00Z') }));
    expect(screen.getByText('ACTUAL NAVER URL CHECK · 2026-11-15')).toBeTruthy();
    expect(screen.getByText(/Recorded guidance was checked October 18, 2026/)).toBeTruthy();
    expect(screen.getAllByText('Verified fields: 0 · Product page not requested · Customs review required')).toHaveLength(4);
  });
});
