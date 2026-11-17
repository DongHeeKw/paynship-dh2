/** Browsing shelves are separate from the product category used for customs review. */
export const CATALOG_CATEGORIES = [
  { value: 'all', label: 'All finds' },
  { value: 'beauty', label: 'Beauty & care' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'home', label: 'Home & living' },
  { value: 'accessories', label: 'Bags & accessories' },
  { value: 'kpop', label: 'K-pop' },
] as const;
export type CatalogCategory = typeof CATALOG_CATEGORIES[number]['value'];

export function catalogCategory(value: string | null | undefined): CatalogCategory {
  return CATALOG_CATEGORIES.find(category => category.value === value)?.value ?? 'all';
}

export function categoryLabel(value: string): string {
  return CATALOG_CATEGORIES.find(category => category.value === value)?.label ?? 'Finds from Korea';
}
