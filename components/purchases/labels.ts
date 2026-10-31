import type { ProductCategory } from '@/lib/purchases/categories';
import { COUNTRY_NAMES, type DESTINATIONS } from '@/lib/purchases/countries';
export const CATEGORY_LABELS: Record<ProductCategory, string> = { clothing: 'Clothing & accessories', books: 'Books', collectibles: 'Collectibles', household: 'Household goods', cosmetics: 'Cosmetics', electronics: 'Electronics', food: 'Food & agricultural products', plants: 'Plants', animal_products: 'Animal products', medicine: 'Medicine', alcohol_tobacco: 'Alcohol & tobacco', other: 'Other' };
export function countryName(code: string) { return COUNTRY_NAMES[code as typeof DESTINATIONS[number]] ?? code; }
export function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
