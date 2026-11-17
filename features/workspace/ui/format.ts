export function dollars(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function workspaceDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' }).format(date);
}

export function shortReference(id: string) {
  return `PN-${id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export const COUNTRY_LABELS: Record<string, string> = { CN: 'China', JP: 'Japan', US: 'United States' };
