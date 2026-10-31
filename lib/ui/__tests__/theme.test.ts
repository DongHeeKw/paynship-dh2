import { describe, expect, it } from 'vitest';
import {
  getActivityTone,
  getAdminKpiTone,
  getBannerTone,
  getOrderStatusTone,
} from '../theme';

describe('theme contract', () => {
  it('maps order statuses to the approved semantic tones', () => {
    expect(getOrderStatusTone('PENDING').tone).toBe('warning');
    expect(getOrderStatusTone('PROCESSING').tone).toBe('warning');
    expect(getOrderStatusTone('PAID').tone).toBe('brand');
    expect(getOrderStatusTone('SHIPPED').tone).toBe('success');
    expect(getOrderStatusTone('DELIVERED').tone).toBe('success');
    expect(getOrderStatusTone('CANCELLED').tone).toBe('danger');
  });

  it('uses the shared CSS-variable palette instead of legacy purple shortcuts', () => {
    const shipped = getOrderStatusTone('SHIPPED');
    const pendingBanner = getBannerTone('info');
    const scrapeActivity = getActivityTone('scrape');
    const conversations = getAdminKpiTone('conversations');

    expect(shipped.badge).toContain('var(--pn-success-soft)');
    expect(shipped.badge).not.toContain('purple');
    expect(pendingBanner.shell).toContain('var(--pn-brand-soft)');
    expect(pendingBanner.action).not.toContain('purple');
    expect(scrapeActivity.icon).toContain('var(--pn-brand-soft)');
    expect(conversations.icon).toContain('var(--pn-brand-soft)');
  });

  it('falls back to neutral tones for unknown status-like inputs', () => {
    const unknown = getOrderStatusTone('UNKNOWN');

    expect(unknown.tone).toBe('neutral');
    expect(unknown.badge).toContain('var(--pn-surface-soft)');
  });
});
