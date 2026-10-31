/**
 * API Rate Limiter
 *
 * Shared rate limiting for API routes.
 * Uses Upstash Redis when configured, otherwise falls back to in-memory token buckets.
 *
 * Uses userId for authenticated users, IP address for guests.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum tokens (requests) in the bucket */
  maxTokens: number;
  /** Time window in milliseconds for token refill */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

// ============================================================================
// In-Memory Store
// ============================================================================

const buckets = new Map<string, TokenBucket>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let redisClient: Redis | null | undefined;
const redisLimiters = new Map<string, Ratelimit>();

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > STALE_THRESHOLD_MS) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent Node from exiting
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ============================================================================
// Core Rate Limit Check
// ============================================================================

/**
 * Check if a request is allowed under the rate limit
 *
 * @param key - Rate limit key (e.g., "session:userId" or "msg:ip")
 * @param config - Rate limit configuration
 * @returns Whether request is allowed and remaining capacity
 */
function checkRateLimitInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  startCleanup();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / config.windowMs) * config.maxTokens;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  // Check if we have tokens
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
    };
  }

  // Calculate retry time
  const retryAfterMs = Math.ceil(((1 - bucket.tokens) / config.maxTokens) * config.windowMs);

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
  };
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redisClient = null;
    return redisClient;
  }

  redisClient = Redis.fromEnv();
  return redisClient;
}

function getRedisLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const limiterKey = `${config.maxTokens}:${config.windowMs}`;
  const existing = redisLimiters.get(limiterKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxTokens, `${config.windowMs} ms`),
    prefix: 'api-rate-limit',
    analytics: false,
  });
  redisLimiters.set(limiterKey, limiter);
  return limiter;
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const limiter = getRedisLimiter(config);
  if (!limiter) {
    return checkRateLimitInMemory(key, config);
  }

  try {
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterMs: result.success
        ? undefined
        : Math.max(0, result.reset - Date.now()),
    };
  } catch {
    return checkRateLimitInMemory(key, config);
  }
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Rate limit configs loaded from AdminSettings defaults
 * These are used with dynamic values from getAdminSettings()
 */
export const RATE_LIMIT_PRESETS = {
  /** Session creation: default 10/hour */
  sessionCreation: (maxPerHour: number): RateLimitConfig => ({
    maxTokens: maxPerHour,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
  /** Message sending: default 30/minute */
  messageSending: (maxPerMinute: number): RateLimitConfig => ({
    maxTokens: maxPerMinute,
    windowMs: 60 * 1000, // 1 minute
  }),
} as const;

// ============================================================================
// Key Generators
// ============================================================================

/**
 * Generate rate limit key from user context
 * Uses userId for logged-in users, IP for guests
 */
export function getRateLimitKey(
  prefix: string,
  userId: string | null,
  ip?: string
): string {
  const identity = userId || ip || 'anonymous';
  return `${prefix}:${identity}`;
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
