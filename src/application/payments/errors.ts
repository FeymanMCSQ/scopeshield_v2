/**
 * PaymentError
 * Owns: Payment infrastructure/integration error definitions.
 * Does NOT own: Domain business rules (e.g. TICKET_NOT_FOUND).
 * Layer: Application
 * Trust zone: none
 */

export type PaymentErrorCode =
  | 'CONFIG_MISSING'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_EVENT_UNSUPPORTED'
  | 'CHECKOUT_SESSION_INVALID';

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly originalError?: unknown;

  constructor(code: PaymentErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.name = 'PaymentError';
  }
}
