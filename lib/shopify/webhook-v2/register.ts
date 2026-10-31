/**
 * PayNShip v2.1 — Webhook 프로그래밍 등록
 *
 * Shopify Admin API의 webhookSubscriptionCreate mutation으로
 * v2.1에서 구독할 topic들을 일괄 등록한다.
 *
 * 실행: scripts/shopify-v2-webhooks/setup-webhooks.ts
 */

import { shopifyV2Gql, throwOnV2UserErrors } from '../admin-v2';

export const V21_WEBHOOK_TOPICS = [
  'ORDERS_PAID',
  'ORDERS_CANCELLED',
  'ORDERS_FULFILLED',
  'PRODUCTS_UPDATE',
  'PRODUCTS_CREATE',
  'APP_UNINSTALLED',
] as const;

export type V21WebhookTopic = (typeof V21_WEBHOOK_TOPICS)[number];

export interface V21WebhookSubscription {
  id: string;
  topic: string;
  endpoint: {
    __typename: string;
    callbackUrl?: string;
  };
  format: string;
  createdAt: string;
}

// ─── Queries / Mutations ──────────────────────────────────

const LIST_SUBSCRIPTIONS_QUERY = `
  query PayNShipListWebhooks {
    webhookSubscriptions(first: 100) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint { callbackUrl }
          }
          format
          createdAt
        }
      }
    }
  }
`;

const CREATE_SUBSCRIPTION_MUTATION = `
  mutation PayNShipWebhookCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
    webhookSubscriptionCreate(
      topic: $topic,
      webhookSubscription: {
        callbackUrl: $callbackUrl,
        format: JSON
      }
    ) {
      webhookSubscription {
        id
        topic
      }
      userErrors { field message }
    }
  }
`;

const DELETE_SUBSCRIPTION_MUTATION = `
  mutation PayNShipWebhookDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors { field message }
    }
  }
`;

// ─── Functions ────────────────────────────────────────────

export async function listSubscriptions(): Promise<V21WebhookSubscription[]> {
  const data = await shopifyV2Gql<{
    webhookSubscriptions: { edges: Array<{ node: V21WebhookSubscription }> };
  }>(LIST_SUBSCRIPTIONS_QUERY);
  return data.webhookSubscriptions.edges.map(e => e.node);
}

export async function createSubscription(
  topic: V21WebhookTopic,
  callbackUrl: string,
): Promise<{ id: string; topic: string }> {
  const data = await shopifyV2Gql<{
    webhookSubscriptionCreate: {
      webhookSubscription: { id: string; topic: string } | null;
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(CREATE_SUBSCRIPTION_MUTATION, { topic, callbackUrl });

  throwOnV2UserErrors(data.webhookSubscriptionCreate, `webhookSubscriptionCreate(${topic})`);
  const sub = data.webhookSubscriptionCreate.webhookSubscription;
  if (!sub) throw new Error(`webhookSubscriptionCreate returned null for ${topic}`);
  return sub;
}

export async function deleteSubscription(id: string): Promise<void> {
  const data = await shopifyV2Gql<{
    webhookSubscriptionDelete: {
      deletedWebhookSubscriptionId: string | null;
      userErrors: Array<{ field?: any; message: string; code?: string }>;
    };
  }>(DELETE_SUBSCRIPTION_MUTATION, { id });
  throwOnV2UserErrors(data.webhookSubscriptionDelete, 'webhookSubscriptionDelete');
}
