/**
 * PayNShip v2.1 — Shopify Draft Order mutations
 * 서버 전용. Checkout 플로우에서 사용.
 *
 * Draft Order:
 *  - Shopify Order 생성 전 단계의 "인보이스"
 *  - invoiceUrl로 고객이 결제 페이지에 접속 → 결제 → Order 전환
 *  - Basic 플랜에서 사용 가능 (Shopify Plus 기능 아님)
 */

import { shopifyV2Gql, throwOnV2UserErrors } from '../admin-v2';

// ─── Input Types ───────────────────────────────────────────

export interface DraftOrderLineItemInput {
  /** Shopify variant GID (또는 custom line item이면 undefined) */
  variantId?: string;
  /** Custom line item 이름 (variantId 없을 때 필수) */
  title?: string;
  /** 수량 (1+) */
  quantity: number;
  /** Original unit price USD (custom line item 또는 price override) */
  originalUnitPrice?: string;
  /** Shopify CustomAttribute 리스트 */
  customAttributes?: Array<{ key: string; value: string }>;
}

export interface DraftOrderMailingAddressInput {
  address1: string;
  address2?: string;
  city: string;
  country: string;              // ISO 3166-1 alpha-2
  province?: string;
  zip: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  name?: string;
  company?: string;
}

export interface CreateDraftOrderInput {
  lineItems: DraftOrderLineItemInput[];
  shippingAddress: DraftOrderMailingAddressInput;
  billingAddress?: DraftOrderMailingAddressInput;
  /** 고객 이메일 (guest checkout 시에도 필수) */
  email: string;
  /** 배송료 수동 지정 (AcrossB 연동 전) */
  shippingLine?: {
    price: string;
    title: string;
  };
  /** Tags */
  tags?: string[];
  /** Note (운영자 메모) */
  note?: string;
  /** 고객에게 보낼 지불 링크 생성 여부 */
  useCustomerDefaultAddress?: boolean;
}

export interface CreatedDraftOrder {
  id: string;                   // gid
  name: string;                 // 예: "D1"
  invoiceUrl: string;           // 고객이 결제할 URL
  totalPrice: string;           // USD
  currencyCode: string;
  subtotalPrice: string;
  totalShippingPrice: string;
  totalTax: string;
  status: string;               // "OPEN" / "INVOICE_SENT" / "COMPLETED"
}

// ─── Mutation ──────────────────────────────────────────────

const DRAFT_ORDER_CREATE_MUTATION = `
  mutation PayNShipDraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        totalPrice
        currencyCode
        subtotalPrice
        totalShippingPrice
        totalTax
        status
      }
      userErrors { field message code }
    }
  }
`;

export async function createDraftOrder(
  input: CreateDraftOrderInput,
): Promise<CreatedDraftOrder> {
  // Shopify expects specific shape
  const gqlInput: any = {
    email: input.email,
    tags: input.tags ?? ['paynship-v2.1'],
    note: input.note,
    useCustomerDefaultAddress: input.useCustomerDefaultAddress ?? false,
    lineItems: input.lineItems.map(li => ({
      variantId: li.variantId,
      title: li.title,
      quantity: li.quantity,
      originalUnitPrice: li.originalUnitPrice,
      customAttributes: li.customAttributes,
    })),
    shippingAddress: {
      address1: input.shippingAddress.address1,
      address2: input.shippingAddress.address2,
      city: input.shippingAddress.city,
      countryCode: input.shippingAddress.country,
      provinceCode: input.shippingAddress.province,
      zip: input.shippingAddress.zip,
      firstName: input.shippingAddress.firstName,
      lastName: input.shippingAddress.lastName,
      phone: input.shippingAddress.phone,
    },
  };

  if (input.billingAddress) {
    gqlInput.billingAddress = {
      address1: input.billingAddress.address1,
      address2: input.billingAddress.address2,
      city: input.billingAddress.city,
      countryCode: input.billingAddress.country,
      provinceCode: input.billingAddress.province,
      zip: input.billingAddress.zip,
      firstName: input.billingAddress.firstName,
      lastName: input.billingAddress.lastName,
      phone: input.billingAddress.phone,
    };
  }

  if (input.shippingLine) {
    gqlInput.shippingLine = {
      price: input.shippingLine.price,
      title: input.shippingLine.title,
    };
  }

  const data = await shopifyV2Gql<{
    draftOrderCreate: {
      draftOrder: CreatedDraftOrder | null;
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(DRAFT_ORDER_CREATE_MUTATION, { input: gqlInput });

  throwOnV2UserErrors(data.draftOrderCreate, 'draftOrderCreate');
  if (!data.draftOrderCreate.draftOrder) {
    throw new Error('draftOrderCreate returned null without userErrors');
  }
  return data.draftOrderCreate.draftOrder;
}
