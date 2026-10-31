/**
 * PayNShip v2.1 — Shopify Product queries
 * 서버 전용 (Admin API).
 */

import { shopifyV2Gql, buildV2Gid } from '../admin-v2';

export interface V2ProductVariant {
  id: string;              // gid
  title: string;
  sku: string | null;
  price: string;           // decimal string
  compareAtPrice: string | null;
  availableForSale: boolean;
  inventoryQuantity: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface V2ProductImage {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface V2ProductMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface V2Product {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  tags: string[];
  descriptionHtml: string;
  onlineStoreUrl: string | null;
  images: V2ProductImage[];
  variants: V2ProductVariant[];
  metafields: V2ProductMetafield[];
}

const PRODUCT_BY_HANDLE_QUERY = `
  query PayNShipProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      vendor
      productType
      status
      tags
      descriptionHtml
      onlineStoreUrl
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            price
            compareAtPrice
            availableForSale
            inventoryQuantity
            selectedOptions { name value }
          }
        }
      }
      metafields(first: 20) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query PayNShipProduct($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      vendor
      productType
      status
      tags
      descriptionHtml
      onlineStoreUrl
      images(first: 10) {
        edges { node { id url altText width height } }
      }
      variants(first: 50) {
        edges {
          node {
            id title sku price compareAtPrice availableForSale inventoryQuantity
            selectedOptions { name value }
          }
        }
      }
      metafields(first: 20) {
        edges { node { namespace key value type } }
      }
    }
  }
`;

interface GqlProductNode {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  status: string;
  tags: string[];
  descriptionHtml: string;
  onlineStoreUrl: string | null;
  images: { edges: Array<{ node: V2ProductImage }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
        availableForSale: boolean;
        inventoryQuantity: number | null;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  metafields: { edges: Array<{ node: V2ProductMetafield }> };
}

function normalizeProduct(p: GqlProductNode | null): V2Product | null {
  if (!p) return null;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    productType: p.productType,
    status: (p.status as V2Product['status']) ?? 'DRAFT',
    tags: p.tags ?? [],
    descriptionHtml: p.descriptionHtml ?? '',
    onlineStoreUrl: p.onlineStoreUrl ?? null,
    images: p.images.edges.map(e => e.node),
    variants: p.variants.edges.map(e => e.node),
    metafields: p.metafields.edges.map(e => e.node),
  };
}

export async function getProductByHandle(handle: string): Promise<V2Product | null> {
  const data = await shopifyV2Gql<{ productByHandle: GqlProductNode | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
  );
  return normalizeProduct(data.productByHandle);
}

export async function getProductById(numericOrGid: string): Promise<V2Product | null> {
  const id = numericOrGid.startsWith('gid://') ? numericOrGid : buildV2Gid('Product', numericOrGid);
  const data = await shopifyV2Gql<{ product: GqlProductNode | null }>(PRODUCT_BY_ID_QUERY, { id });
  return normalizeProduct(data.product);
}
