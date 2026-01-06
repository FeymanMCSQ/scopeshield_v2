/**
 * PaymentPort
 * Owns: Interface for payment provider interactions.
 * Does NOT own: Provider-specific types (no Stripe SDK types here).
 * Layer: Application
 * Trust zone: none
 */

export interface CreateCheckoutSessionInput {
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface CheckoutSessionResult {
  url: string;
  providerSessionId: string;
}

export interface WebhookEventResult {
  type: string;
  providerSessionId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentPort {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyAndParseEvent(body: string | Buffer, signature: string): Promise<WebhookEventResult>;
}
