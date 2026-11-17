import { catalogCategory, type CatalogCategory } from './categories';
const PAGE_SIZE = 4;

export function catalogPage<T extends { shelf: string }>(items: readonly T[], query: { category?: string | null; type?: string | null; page?: string | null }) {
  const legacyCategory = query.type === 'album' || query.type === 'lightstick' ? 'kpop' : 'all';
  const category = catalogCategory(query.category ?? legacyCategory);
  const filtered = items.filter(item => category === 'all' || item.shelf === category);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requested = /^[1-9]\d*$/.test(query.page ?? '') ? Number(query.page) : 1;
  const page = Math.min(pages, requested);
  const offset = (page - 1) * PAGE_SIZE;
  return { category, page, pages, total: filtered.length, start: filtered.length ? offset + 1 : 0,
    end: Math.min(offset + PAGE_SIZE, filtered.length), items: filtered.slice(offset, offset + PAGE_SIZE) };
}

export function catalogHref(category: CatalogCategory, page = 1) {
  const query = new URLSearchParams();
  if (category !== 'all') query.set('category', category);
  if (page > 1) query.set('page', String(page));
  return '/products' + (query.size ? '?' + query.toString() : '');
}
