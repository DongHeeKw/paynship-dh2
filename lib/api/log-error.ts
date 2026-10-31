/**
 * Structured API Error Logger
 *
 * Logs errors with request context (requestId, URL) for production debugging.
 */

import type { NextRequest } from 'next/server';

export function logApiError(context: string, request: NextRequest | Request, error: unknown): void {
  const headers = 'headers' in request ? request.headers : new Headers();
  const url = 'url' in request ? request.url : 'unknown';
  console.error(`[${context}]`, {
    requestId: headers.get('x-vercel-id') || headers.get('x-request-id') || 'none',
    url,
    error: error instanceof Error
      ? { message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') }
      : error,
  });
}
