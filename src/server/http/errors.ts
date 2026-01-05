/**
 * server/http/errors
 * Owns: mapping unknown errors to HTTP-safe responses (edge helper).
 * Does NOT own: domain logic or persistence.
 * Layer: Application (edge support)
 * Trust zone: web/ext/public
 */

import { DomainError } from '@/domain/shared';
import { HttpError } from '@/server/http/httpError';

export type HttpErrorBody = { error: string; code?: string };

export function toHttpError(err: unknown): {
  status: number;
  body: HttpErrorBody;
} {
  // Domain errors: typed and intentional
  if (err instanceof DomainError) {
    switch (err.code) {
      case 'VALIDATION_ERROR':
        return { status: 400, body: { error: err.message, code: err.code } };
      case 'NOT_FOUND':
        return { status: 404, body: { error: err.message, code: err.code } };
      case 'FORBIDDEN':
        return { status: 403, body: { error: err.message, code: err.code } };
      case 'CONFLICT':
        return { status: 409, body: { error: err.message, code: err.code } };
      default:
        return { status: 400, body: { error: err.message, code: err.code } };
    }
  }
  if (err instanceof HttpError) {
    return { status: err.status, body: { error: err.message, code: err.code } };
  }

  // Generic Error: still safe, but don't over-share in prod
  if (err instanceof Error) {
    const msg =
      process.env.NODE_ENV === 'production' ? 'Internal error' : err.message;
    return { status: 500, body: { error: msg } };
  }

  // Non-error throws (string, number, etc.)
  return {
    status: 500,
    body: { error: 'Internal error' },
  };
}
