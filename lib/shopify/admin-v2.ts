/**
 * PayNShip v2.1 — Shopify Admin GraphQL client (서버 전용)
 *
 * 기존 `lib/shopify/client.ts` (v1, SHOPIFY_STORE_DOMAIN)와 분리된
 * v2.1 전용 client. `_V2` env 변수를 사용한다 (ehj0yx-zs.myshopify.com).
 *
 * v1 Option D Hybrid 로직과 독립적으로 작동. 점진적 통합 예정.
 */

export interface V2GqlResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus?: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export class ShopifyV2Error extends Error {
  constructor(
    message: string,
    public readonly gqlErrors?: Array<{ message: string; path?: any }>,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ShopifyV2Error';
  }
}

function getV2Config() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN_V2;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN_V2;
  const apiVersion = process.env.SHOPIFY_API_VERSION ?? '2025-10';
  if (!domain || !adminToken) {
    throw new ShopifyV2Error(
      'Missing SHOPIFY_STORE_DOMAIN_V2 or SHOPIFY_ADMIN_ACCESS_TOKEN_V2 env',
    );
  }
  return { domain, adminToken, apiVersion };
}

/**
 * Execute a GraphQL request against Shopify v2.1 Admin API.
 */
export async function shopifyV2Gql<T = any>(
  query: string,
  variables: Record<string, any> = {},
  opts?: { timeoutMs?: number },
): Promise<T> {
  const cfg = getV2Config();
  const url = `https://${cfg.domain}/admin/api/${cfg.apiVersion}/graphql.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': cfg.adminToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new ShopifyV2Error(
      err instanceof Error ? `network: ${err.message}` : 'network error',
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new ShopifyV2Error(
      `HTTP ${res.status}: ${await res.text().catch(() => '')}`,
      undefined,
      res.status,
    );
  }

  const body = (await res.json()) as V2GqlResponse<T>;
  if (body.errors && body.errors.length > 0) {
    throw new ShopifyV2Error(
      `GraphQL: ${body.errors.map(e => e.message).join('; ')}`,
      body.errors,
    );
  }
  if (!body.data) {
    throw new ShopifyV2Error('response missing data');
  }
  return body.data;
}

/**
 * Throw on userErrors[] (Shopify mutation convention).
 */
export function throwOnV2UserErrors(
  result: { userErrors?: Array<{ field?: any; message: string; code?: string }> } | undefined,
  label: string,
): void {
  const errs = result?.userErrors;
  if (!errs || errs.length === 0) return;
  const msg = errs
    .map(
      e =>
        `${e.field ? `[${Array.isArray(e.field) ? e.field.join('.') : e.field}] ` : ''}${
          e.message
        }${e.code ? ` (${e.code})` : ''}`,
    )
    .join('; ');
  throw new ShopifyV2Error(`${label} userErrors: ${msg}`);
}

/**
 * Extract numeric ID from Shopify GID.
 * e.g., "gid://shopify/Product/1234" → "1234"
 */
export function extractV2Id(gid: string): string {
  const m = gid.match(/\/(\d+)$/);
  return m ? m[1] : gid;
}

/**
 * Build a Shopify GID from type + numeric id.
 */
export function buildV2Gid(type: 'Product' | 'ProductVariant' | 'Customer' | 'Order' | 'DraftOrder', id: string): string {
  return `gid://shopify/${type}/${id}`;
}
