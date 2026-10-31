/**
 * Session Security Utilities
 *
 * Provides HMAC-based session token generation and verification
 * to prevent session hijacking for guest users.
 */

import crypto from 'crypto';

// SECURITY: SESSION_SECRET must be set in environment and be at least 32 characters
// Validation is deferred to runtime to avoid build-time failures

let _effectiveSecret: string | null = null;
let _validated = false;

/**
 * Get the effective secret, validating on first use (runtime)
 * This defers validation to runtime instead of module load time
 */
function getEffectiveSecret(): string {
  if (_validated && _effectiveSecret) {
    return _effectiveSecret;
  }

  const SESSION_SECRET = process.env.SESSION_SECRET;

  if (!SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SESSION_SECRET environment variable is required in production. ' +
        'Generate a secure random string of at least 32 characters.'
      );
    }
    console.warn(
      '[SECURITY WARNING] SESSION_SECRET not set. Using insecure default for development only. ' +
      'Set SESSION_SECRET in your .env file before deploying to production.'
    );
  }

  if (SESSION_SECRET && SESSION_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SESSION_SECRET must be at least 32 characters. Current length: ' +
        SESSION_SECRET.length
      );
    }
    console.warn(
      `[SECURITY WARNING] SESSION_SECRET is too short (${SESSION_SECRET.length} chars). ` +
      'Use at least 32 characters for production.'
    );
  }

  // Use the secret or a development-only fallback (NEVER in production)
  _effectiveSecret = SESSION_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod';
  _validated = true;

  return _effectiveSecret;
}

/**
 * Generate HMAC token for a session ID
 * This creates a cryptographic signature that binds the session to a specific client
 *
 * @param sessionId - The session UUID
 * @param userAgent - Optional user agent string for additional binding
 * @returns HMAC token (hex string)
 */
export function generateSessionToken(sessionId: string, userAgent?: string): string {
  const data = userAgent ? `${sessionId}:${userAgent}` : sessionId;
  return crypto
    .createHmac('sha256', getEffectiveSecret())
    .update(data)
    .digest('hex');
}

/**
 * Verify session token matches the session ID
 *
 * @param sessionId - The session UUID
 * @param token - The HMAC token to verify
 * @param userAgent - Optional user agent (must match what was used in generation)
 * @returns true if token is valid, false otherwise
 */
export function verifySessionToken(
  sessionId: string,
  token: string,
  userAgent?: string
): boolean {
  try {
    const expectedToken = generateSessionToken(sessionId, userAgent);

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch (error) {
    // Invalid token format or other error
    return false;
  }
}

/**
 * Extract session credentials from request headers
 *
 * @param headers - Next.js request headers
 * @returns { sessionId, token, userAgent } or null if missing
 */
export function extractSessionCredentials(headers: Headers): {
  sessionId: string;
  token: string;
  userAgent?: string;
} | null {
  const sessionId = headers.get('x-session-id');
  const token = headers.get('x-session-token');
  const userAgent = headers.get('user-agent');

  if (!sessionId || !token) {
    return null;
  }

  return {
    sessionId,
    token,
    userAgent: userAgent || undefined,
  };
}

/**
 * Verify guest session from request headers
 *
 * @param headers - Next.js request headers
 * @returns sessionId if valid, null if invalid or missing
 */
export function verifyGuestSession(headers: Headers): string | null {
  const credentials = extractSessionCredentials(headers);

  if (!credentials) {
    return null;
  }

  const isValid = verifySessionToken(
    credentials.sessionId,
    credentials.token,
    credentials.userAgent
  );

  return isValid ? credentials.sessionId : null;
}

/**
 * Create session credentials for client
 * Returns both sessionId and token that should be sent in future requests
 *
 * @param sessionId - The session UUID
 * @param userAgent - Optional user agent
 * @returns { sessionId, token }
 */
export function createSessionCredentials(
  sessionId: string,
  userAgent?: string
): {
  sessionId: string;
  token: string;
} {
  return {
    sessionId,
    token: generateSessionToken(sessionId, userAgent),
  };
}
