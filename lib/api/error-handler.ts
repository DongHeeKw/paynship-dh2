/**
 * API Error Handler
 *
 * 통일된 에러 응답 형식 및 로깅.
 * 모든 API 라우트에서 이 모듈을 사용해야 합니다.
 *
 * @example
 * ```ts
 * // Validation error
 * return createApiError('Invalid email format', 400, 'VALIDATION_ERROR');
 *
 * // Catch block
 * } catch (error) {
 *   return handleApiError(error, 'OrderAPI');
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Standard API Error Response (SSoT)
 * All API error responses should use this type.
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  /** Set to true when user needs to login */
  requireLogin?: boolean;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Standard error codes for client-side handling
 */
export const ErrorCodes = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // External
  SCRAPE_FAILED: 'SCRAPE_FAILED',
  LLM_ERROR: 'LLM_ERROR',
  SHOPIFY_ERROR: 'SHOPIFY_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Error Creation
// ============================================================================

/**
 * Create a standardized API error response
 */
export function createApiError(
  message: string,
  status: number,
  code?: ErrorCode,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { error: message };

  if (code) body.code = code;
  if (details !== undefined) body.details = details;

  return NextResponse.json(body, { status });
}

/**
 * Create common error responses (shortcuts)
 */
export const ApiErrors = {
  badRequest: (message: string, code?: ErrorCode, details?: unknown) =>
    createApiError(message, 400, code ?? ErrorCodes.INVALID_INPUT, details),

  unauthorized: (message = 'Authentication required') =>
    createApiError(message, 401, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = 'Access denied') =>
    createApiError(message, 403, ErrorCodes.FORBIDDEN),

  notFound: (resource = 'Resource') =>
    createApiError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),

  conflict: (message: string) =>
    createApiError(message, 409, ErrorCodes.CONFLICT),

  rateLimited: (message = 'Too many requests') =>
    createApiError(message, 429, ErrorCodes.RATE_LIMITED),

  internal: (message = 'Internal server error') =>
    createApiError(message, 500, ErrorCodes.INTERNAL_ERROR),
};

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle unknown errors in catch blocks
 *
 * @param error - The caught error
 * @param context - Context string for logging (e.g., 'CartAPI', 'OrderService')
 * @param options - Additional options
 */
export function handleApiError(
  error: unknown,
  context: string,
  options?: {
    /** Return detailed error message in response (default: false in production) */
    exposeDetails?: boolean;
    /** Default status code if error type unknown (default: 500) */
    defaultStatus?: number;
  }
): NextResponse<ApiErrorResponse> {
  const { exposeDetails = process.env.NODE_ENV !== 'production', defaultStatus = 500 } = options ?? {};

  // Extract error info
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log the error
  logger.error(`[${context}] ${errorMessage}`, { stack: errorStack, error });

  // Determine appropriate response
  if (isPrismaError(error)) {
    return handlePrismaError(error, context);
  }

  // Check for specific error patterns
  if (errorMessage.includes('not found')) {
    return ApiErrors.notFound();
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
    return ApiErrors.unauthorized();
  }

  // Default internal error
  return createApiError(
    exposeDetails ? errorMessage : 'An unexpected error occurred',
    defaultStatus,
    ErrorCodes.INTERNAL_ERROR,
    exposeDetails ? { originalError: errorMessage } : undefined
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: PrismaClientKnownRequestError,
  context: string
): NextResponse<ApiErrorResponse> {
  logger.error(`[${context}] Prisma Error: ${error.code}`, { meta: error.meta });

  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return createApiError(
        'Resource already exists',
        409,
        ErrorCodes.ALREADY_EXISTS,
        { field: error.meta?.target }
      );

    case 'P2025': // Record not found
      return ApiErrors.notFound();

    case 'P2003': // Foreign key constraint
      return createApiError(
        'Related resource not found',
        400,
        ErrorCodes.INVALID_INPUT
      );

    default:
      return createApiError(
        'Database error',
        500,
        ErrorCodes.DATABASE_ERROR
      );
  }
}

// ============================================================================
// Success Response Helpers
// ============================================================================

/**
 * Create a standardized success response
 */
export function createApiSuccess<T>(
  data?: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { success: true };

  if (data !== undefined) body.data = data;
  if (message) body.message = message;

  return NextResponse.json(body, { status });
}

// ============================================================================
// Prisma Error Type (minimal definition to avoid import issues)
// ============================================================================

interface PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

/**
 * Type guard for Prisma errors
 */
function isPrismaError(error: unknown): error is PrismaClientKnownRequestError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as PrismaClientKnownRequestError).code === 'string' &&
    (error as PrismaClientKnownRequestError).code.startsWith('P')
  );
}
