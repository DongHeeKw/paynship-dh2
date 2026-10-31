/**
 * PayNShip v2.1 — Shopify Product mutations (Auto-Mirror용)
 * 서버 전용.
 *
 * MVP 범위:
 *  - productCreate (DRAFT status 기본)
 *  - productUpdate (metafield sync)
 *  - productVariantsBulkCreate (variant 추가)
 */

import { shopifyV2Gql, throwOnV2UserErrors } from '../admin-v2';
import type { V2ProductVariant, V2ProductImage } from '../queries-v2/product';

// ─── Types ──────────────────────────────────────────────────
export interface CreateProductInput {
  title: string;
  handle?: string;
  vendor: string;
  productType?: string;
  descriptionHtml?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  metafields?: Array<{ namespace: string; key: string; value: string; type: string }>;
}

export interface CreateVariantInput {
  price: string;            // "29.99"
  sku?: string;
  compareAtPrice?: string;
  options: Array<{ name: string; value: string }>; // e.g., [{name:"Size", value:"M"}]
  inventoryQuantity?: number;
  inventoryPolicy?: 'CONTINUE' | 'DENY';
  requiresShipping?: boolean;
  taxable?: boolean;
}

// ─── Mutations ──────────────────────────────────────────────
const PRODUCT_CREATE_MUTATION = `
  mutation PayNShipProductCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        handle
        title
        status
      }
      userErrors { field message code }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_CREATE_MUTATION = `
  mutation PayNShipProductVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        sku
        price
        selectedOptions { name value }
      }
      userErrors { field message code }
    }
  }
`;

const PRODUCT_OPTIONS_CREATE_MUTATION = `
  mutation PayNShipProductOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
    productOptionsCreate(productId: $productId, options: $options) {
      product { id }
      userErrors { field message code }
    }
  }
`;

export interface CreatedProduct {
  id: string;              // gid
  handle: string;
  title: string;
  status: string;
}

/**
 * Create a Shopify Product (status DRAFT by default).
 * NOTE: productCreate does NOT attach variants in 2025-10 API.
 * Use `productVariantsBulkCreate` afterwards to add variants.
 */
export async function createProduct(input: CreateProductInput): Promise<CreatedProduct> {
  const productInput = {
    title: input.title,
    handle: input.handle,
    vendor: input.vendor,
    productType: input.productType,
    descriptionHtml: input.descriptionHtml,
    tags: input.tags,
    status: input.status ?? 'DRAFT',
    metafields: input.metafields,
  };

  const data = await shopifyV2Gql<{
    productCreate: {
      product: CreatedProduct | null;
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(PRODUCT_CREATE_MUTATION, { product: productInput });

  throwOnV2UserErrors(data.productCreate, 'productCreate');
  if (!data.productCreate.product) {
    throw new Error('productCreate returned null product without userErrors');
  }
  return data.productCreate.product;
}

export interface CreatedVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  selectedOptions: Array<{ name: string; value: string }>;
}

/**
 * Add variants to an existing product.
 * For Auto-Mirror: 같은 canonical 상품의 다른 옵션 발견 시 호출.
 */
export async function createProductVariants(
  productId: string,
  variants: CreateVariantInput[],
): Promise<CreatedVariant[]> {
  const data = await shopifyV2Gql<{
    productVariantsBulkCreate: {
      productVariants: CreatedVariant[];
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(PRODUCT_VARIANTS_BULK_CREATE_MUTATION, {
    productId,
    variants: variants.map(v => ({
      price: v.price,
      sku: v.sku,
      compareAtPrice: v.compareAtPrice,
      optionValues: v.options.map(o => ({ optionName: o.name, name: o.value })),
      inventoryPolicy: v.inventoryPolicy ?? 'CONTINUE',
      inventoryQuantities: v.inventoryQuantity != null
        ? [{ availableQuantity: v.inventoryQuantity, locationId: '' }]
        : undefined,
      requiresShipping: v.requiresShipping ?? true,
      taxable: v.taxable ?? true,
    })),
  });

  throwOnV2UserErrors(data.productVariantsBulkCreate, 'productVariantsBulkCreate');
  return data.productVariantsBulkCreate.productVariants;
}

/**
 * Create product options (Size, Color, etc.) — required before adding non-default variants.
 */
export async function createProductOptions(
  productId: string,
  options: Array<{ name: string; values: string[] }>,
): Promise<void> {
  const data = await shopifyV2Gql<{
    productOptionsCreate: {
      product: { id: string } | null;
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(PRODUCT_OPTIONS_CREATE_MUTATION, {
    productId,
    options: options.map(o => ({
      name: o.name,
      values: o.values.map(v => ({ name: v })),
    })),
  });
  throwOnV2UserErrors(data.productOptionsCreate, 'productOptionsCreate');
}
