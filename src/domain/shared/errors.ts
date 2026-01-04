/**
 * shared/errors
 * Owns: domain error types (typed failures).
 * Does NOT own: HTTP status mapping (edge concern).
 * Layer: Domain
 * Trust zone: none
 */

export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVARIANT_VIOLATION';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) throw new DomainError('INVARIANT_VIOLATION', message);
}
