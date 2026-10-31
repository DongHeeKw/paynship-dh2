/**
 * Notification Service
 *
 * Sends email notifications via Resend when RESEND_API_KEY is set.
 * Falls back to logging when key is absent (development mode).
 */

import logger from '@/lib/utils/logger';
import { prisma } from '@/lib/db/prisma';

export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'WAREHOUSE_RECEIVED'
  | 'PHASE2_PAYMENT_REQUEST'
  | 'PHASE2_PAYMENT_OVERDUE'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_COMPLETED'
  | 'REFUND_COMPLETED';

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  data: Record<string, unknown>;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@paynship.com';

/** Escape HTML special characters to prevent HTML injection in email templates. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate a URL allows only https: protocol to prevent javascript:/data: injection. */
function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function buildEmailTemplate(
  type: NotificationType,
  data: Record<string, unknown>
): { subject: string; html: string } {
  switch (type) {
    case 'ORDER_CONFIRMED':
      return {
        subject: `Order #${escapeHtml(data.orderId)} confirmed — PayNShip`,
        html: `
          <h2>Your order has been confirmed!</h2>
          <p>Order ID: <strong>${escapeHtml(data.orderId) || 'N/A'}</strong></p>
          <p>We've received your order and will begin procurement shortly.</p>
          <p>You'll receive another email when your item arrives at our warehouse.</p>
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'WAREHOUSE_RECEIVED':
      return {
        subject: 'Your item has arrived at our warehouse — PayNShip',
        html: `
          <h2>Your item has arrived at our warehouse!</h2>
          <p>Chargeable weight: <strong>${escapeHtml(data.chargeableWeightKg) || 'N/A'} kg</strong></p>
          <p>We are now calculating your shipping cost. You will receive a payment request shortly.</p>
          ${data.warehouseNotes ? `<p>Warehouse notes: ${escapeHtml(data.warehouseNotes)}</p>` : ''}
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'PHASE2_PAYMENT_REQUEST': {
      const payUrl = safeHttpsUrl(data.checkoutUrl);
      return {
        subject: `Shipping payment required: $${escapeHtml(data.amount) || '?'} — PayNShip`,
        html: `
          <h2>Shipping payment ready</h2>
          <p>Your shipping cost has been calculated: <strong>$${escapeHtml(data.amount) || 'N/A'}</strong></p>
          <p>Please complete payment within 3 days to avoid delays.</p>
          ${data.dueDate ? `<p>Payment due: <strong>${escapeHtml(data.dueDate)}</strong></p>` : ''}
          ${payUrl ? `<p><a href="${payUrl}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Pay Now</a></p>` : ''}
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };
    }

    case 'PHASE2_PAYMENT_OVERDUE': {
      const overduePayUrl = safeHttpsUrl(data.checkoutUrl);
      return {
        subject: 'Reminder: Shipping payment overdue — PayNShip',
        html: `
          <h2>Shipping payment overdue</h2>
          <p>Your shipping payment of <strong>$${escapeHtml(data.amount) || 'N/A'}</strong> is overdue.</p>
          <p>Please pay as soon as possible to avoid order cancellation.</p>
          ${overduePayUrl ? `<p><a href="${overduePayUrl}" style="background:#c00;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Pay Now</a></p>` : ''}
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };
    }

    case 'ORDER_SHIPPED':
      return {
        subject: 'Your order has been shipped! — PayNShip',
        html: `
          <h2>Your order is on its way!</h2>
          ${data.trackingNumber ? `<p>Tracking number: <strong>${escapeHtml(data.trackingNumber)}</strong></p>` : ''}
          ${data.carrier ? `<p>Carrier: ${escapeHtml(data.carrier)}</p>` : ''}
          ${data.estimatedDelivery ? `<p>Estimated delivery: ${escapeHtml(data.estimatedDelivery)}</p>` : ''}
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'ORDER_DELIVERED':
      return {
        subject: 'Your order has been delivered! — PayNShip',
        html: `
          <h2>Your order has been delivered!</h2>
          <p>Thank you for shopping with PayNShip. We hope you love your Korean purchase!</p>
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'REFUND_COMPLETED':
      return {
        subject: `Refund processed for order #${escapeHtml(data.orderId)} — PayNShip`,
        html: `
          <h2>Your refund has been processed</h2>
          <p>Order ID: <strong>${escapeHtml(data.orderId) || 'N/A'}</strong></p>
          <p>Refund amount: <strong>$${escapeHtml(data.amountUsd) || 'N/A'}</strong></p>
          <p>Your refund has been successfully processed. Please allow 3–5 business days for the amount to appear in your account.</p>
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'ORDER_CANCELLED':
      return {
        subject: `Order #${escapeHtml(data.orderId)} has been cancelled — PayNShip`,
        html: `
          <h2>Your order has been cancelled</h2>
          <p>Order ID: <strong>${escapeHtml(data.orderId) || 'N/A'}</strong></p>
          <p>${escapeHtml(data.reason) || 'Your order has been cancelled due to non-payment of the shipping fee.'}</p>
          <p>If you believe this is an error or have any questions, please contact our support team.</p>
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    case 'ORDER_COMPLETED':
      return {
        subject: `Order #${escapeHtml(data.orderId)} completed — PayNShip`,
        html: `
          <h2>Your order is complete!</h2>
          <p>Order ID: <strong>${escapeHtml(data.orderId) || 'N/A'}</strong></p>
          <p>Thank you for shopping with PayNShip. Your order has been successfully completed.</p>
          <hr/>
          <p style="color:#888;font-size:12px;">PayNShip — Korean shopping made easy</p>
        `,
      };

    default:
      return {
        subject: `Notification — PayNShip`,
        html: `<p>You have a new notification from PayNShip.</p>`,
      };
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('[Notification]', 'RESEND_API_KEY not set — skipping real send');
    return;
  }

  // Dynamic import to avoid loading when key is absent
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

/**
 * Send a notification to a user.
 * Sends real email via Resend when RESEND_API_KEY is configured,
 * otherwise falls back to logging (development mode).
 */
export async function notifyCustomer(options: NotifyOptions): Promise<void> {
  const { userId, type, data } = options;

  logger.info('Notification', `${type} → user:${userId}`, data);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notificationPref: true },
    });

    if (!user) {
      logger.warn(`[Notification] User ${userId} not found`);
      return;
    }

    const { subject, html } = buildEmailTemplate(type, data);

    if (process.env.RESEND_API_KEY && user.email) {
      await sendViaResend(user.email, subject, html);
      logger.info('[Notification]', `Email sent: ${type} → ${user.email}`);
    } else {
      // Fallback: log what would be sent
      logger.info('[Notification]', `Dry-run (no RESEND_API_KEY): ${type} → ${user.email ?? 'no-email'}`);
    }
  } catch (error) {
    // Notification failure is non-blocking
    logger.error(`[Notification] Failed for ${type}:`, error);
  }
}
