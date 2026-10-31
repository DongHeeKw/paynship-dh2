export const PRODUCT_CATEGORIES = ['clothing', 'books', 'collectibles', 'household', 'cosmetics', 'electronics', 'food', 'plants', 'animal_products', 'medicine', 'alcohol_tobacco', 'other'] as const;
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// This is an initial service scope, not a declaration that imports are illegal.
export const RESTRICTED_CATEGORIES: readonly ProductCategory[] = ['food', 'plants', 'animal_products', 'medicine', 'alcohol_tobacco'];

export function intakeDecision(category: ProductCategory) {
  return RESTRICTED_CATEGORIES.includes(category) ? 'OUT_OF_SCOPE' as const : 'REVIEW_REQUIRED' as const;
}
