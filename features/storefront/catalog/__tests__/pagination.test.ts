import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { catalogHref, catalogPage } from '../pagination';
import references from '../references.json';
import { validateProductUrl } from '@/lib/purchases/product-url';
import { PRODUCT_CATEGORIES } from '@/lib/purchases/categories';

const items = Array.from({ length: 8 }, (_, index) => ({ id: String(index), shelf: index < 6 ? 'beauty' : 'kpop' }));

describe('catalog page selection', () => {
  it('shows four products at a time with no overlap or missing items', () => {
    const first = catalogPage(items, {});
    const second = catalogPage(items, { page: '2' });
    expect(first.items.map(item => item.id)).toEqual(['0', '1', '2', '3']);
    expect(second.items.map(item => item.id)).toEqual(['4', '5', '6', '7']);
    expect(first).toMatchObject({ page: 1, pages: 2, total: 8, start: 1, end: 4 });
    expect(second).toMatchObject({ page: 2, start: 5, end: 8 });
  });
  it('filters before pagination and clamps a stale page after filtering', () => {
    expect(catalogPage(items, { category: 'beauty', page: '2' }).items.map(item => item.id)).toEqual(['4', '5']);
    expect(catalogPage(items, { category: 'kpop', page: '2' })).toMatchObject({ page: 1, pages: 1, total: 2 });
  });
  it.each(['-1', '0', '2.4', '2oops', 'Infinity', ''])('rejects malformed page %s', page => {
    expect(catalogPage(items, { page }).page).toBe(1);
  });
  it('bounds huge page numbers, unknown types and empty results', () => {
    expect(catalogPage(items, { page: '999', category: 'unknown' })).toMatchObject({ category: 'all', page: 2 });
    expect(catalogPage([], { page: '2' })).toMatchObject({ items: [], page: 1, pages: 1, total: 0, start: 0, end: 0 });
  });
  it('creates bookmarkable page URLs and resets filters to their first page', () => {
    expect(catalogHref('all', 1)).toBe('/products');
    expect(catalogHref('all', 2)).toBe('/products?page=2');
    expect(catalogHref('beauty', 2)).toBe('/products?category=beauty&page=2');
    expect(catalogHref('kpop', 1)).toBe('/products?category=kpop');
  });
  it('retains old album and lightstick bookmarks in the K-pop shelf', () => {
    expect(catalogPage(items, { type: 'album' }).category).toBe('kpop');
    expect(catalogPage(items, { type: 'lightstick' }).category).toBe('kpop');
    expect(catalogPage(items, { category: 'beauty', type: 'album' }).category).toBe('beauty');
  });
});

it('ships eight distinct listing references with local seller photographs', () => {
  expect(references.items).toHaveLength(8);
  expect(new Set(references.items.map(item => item.sourceUrl)).size).toBe(8);
  for (const item of references.items) {
    expect(existsSync('public' + item.image), item.id).toBe(true);
    expect(validateProductUrl(item.sourceUrl)).toBe(item.sourceUrl);
    expect(new URL(item.imageSource).protocol).toBe('https:');
  }
});

it('offers five lifestyle categories with a minority of fandom references', () => {
  const shelves = references.items.map(item => item.shelf);
  expect(new Set(shelves)).toEqual(new Set(['beauty', 'stationery', 'home', 'accessories', 'kpop']));
  expect(shelves.filter(shelf => shelf === 'kpop')).toHaveLength(2);
  expect(new Set(shelves.slice(0, 4)).size).toBe(4);
  for (const item of references.items) expect(PRODUCT_CATEGORIES).toContain(item.category);
});

it('searches product names and brands before pagination without pretending to verify stock', () => {
  expect(catalogPage(references.items, { q: '  ICONIC  ' }).items.map((item) => item.id)).toEqual(['iconic-notebook']);
  expect(catalogPage(references.items, { q: 'not-a-product' }).total).toBe(0);
  expect(catalogHref('stationery', 1, 'lined notebook')).toBe('/products?category=stationery&q=lined+notebook');
});
