/**
 * Ops Alerting Module
 *
 * Sends critical operational events to a Slack webhook.
 * Env: OPS_SLACK_WEBHOOK_URL (optional — logs only when not set)
 *
 * @module lib/ops/alerting
 */

// ============================================================================
// Types
// ============================================================================

export type AlertLevel = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'new_order'
  | 'payment_failed'
  | 'circuit_breaker_tripped'
  | 'phase2_overdue'
  | 'exchange_rate_drift'
  | 'cron_failure'
  | 'scraper_down'
  | 'stuck_order'
  | 'cs_handoff_requested';

export interface AlertDetails {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// Color mapping
// ============================================================================

const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: '#0066CC',       // blue
  warning: '#FFB300',    // yellow
  critical: '#CC0000',   // red
};

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  info: ':information_source:',
  warning: ':warning:',
  critical: ':rotating_light:',
};

// ============================================================================
// Main function
// ============================================================================

/**
 * Send an ops alert to Slack webhook (or console if not configured).
 *
 * @param level   - Severity level
 * @param type    - Alert type identifier
 * @param message - Human-readable message
 * @param details - Optional key-value pairs for context
 */
export async function sendOpsAlert(
  level: AlertLevel,
  type: AlertType,
  message: string,
  details?: AlertDetails
): Promise<void> {
  const webhookUrl = process.env.OPS_SLACK_WEBHOOK_URL;
  const timestamp = new Date().toISOString();

  if (!webhookUrl) {
    console.log('[OPS ALERT]', JSON.stringify({ level, type, message, details, timestamp }));
    return;
  }

  try {
    const detailsText = details
      ? Object.entries(details)
          .map(([k, v]) => `• *${k}*: ${v ?? 'n/a'}`)
          .join('\n')
      : '';

    const body = {
      attachments: [
        {
          color: LEVEL_COLORS[level],
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${LEVEL_EMOJI[level]} [${level.toUpperCase()}] ${type}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message,
              },
            },
            ...(detailsText
              ? [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: detailsText,
                    },
                  },
                ]
              : []),
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Time*: ${timestamp} | *Service*: PayNShip`,
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('[OPS ALERT] Slack webhook failed:', response.status, await response.text());
    }
  } catch (err) {
    // Never let alerting crash the caller
    console.error('[OPS ALERT] Failed to send Slack alert:', err);
  }
}
