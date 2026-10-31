export type SemanticTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
interface ToneClasses { tone: SemanticTone; badge: string; shell: string; icon: string; action: string; emphasis: string; progress: string; ring: string; }
function tone(tone: SemanticTone): ToneClasses {
  const foreground = tone === 'neutral' ? 'ink-soft' : tone;
  const background = tone === 'neutral' ? 'surface-soft' : `${tone}-soft`;
  return { tone, badge: `border border-[var(--pn-border)] bg-[var(--pn-${background})] text-[var(--pn-${foreground})]`, shell: `border border-[var(--pn-border)] bg-[var(--pn-${background})] text-[var(--pn-${foreground})]`, icon: `bg-[var(--pn-${background})] text-[var(--pn-${foreground})]`, action: `border border-[var(--pn-border)] bg-white text-[var(--pn-${foreground})] hover:bg-[var(--pn-${background})]`, emphasis: `text-[var(--pn-${foreground})]`, progress: 'bg-neutral-900', ring: 'ring-neutral-300' };
}
export function getOrderStatusTone(status: string): ToneClasses { return tone(({ PENDING: 'warning', PROCESSING: 'warning', PAID: 'brand', SHIPPED: 'success', DELIVERED: 'success', CANCELLED: 'danger' } as Record<string, SemanticTone>)[status] || 'neutral'); }
export function getBannerTone(value: 'info' | 'success' | 'warning' | 'danger'): ToneClasses { return tone(value === 'info' ? 'brand' : value); }
export function getActivityTone(type: 'order' | 'error' | 'user' | 'scrape' | 'guardrail'): ToneClasses { return tone(({ order: 'success', error: 'danger', user: 'neutral', scrape: 'brand', guardrail: 'warning' } as const)[type]); }
export function getAdminKpiTone(type: 'conversations' | 'orders' | 'llm' | 'scrape'): ToneClasses { return tone(({ conversations: 'brand', orders: 'success', llm: 'neutral', scrape: 'warning' } as const)[type]); }
