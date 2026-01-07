/**
 * StripeAdapter
 * Owns: implementation of PaymentPort using Stripe SDK.
 * Does NOT own: domain logic, business rules.
 * Layer: Infrastructure
 * Trust zone: none (agnostic)
 */

import Stripe from 'stripe';
import {
  PaymentPort,
  CreateCheckoutSessionInput,
  CheckoutSessionResult,
  WebhookEventResult,
} from '@/application/payments/paymentPort';
import { PaymentError } from '@/application/payments/errors';

export class StripeAdapter implements PaymentPort {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    if (!secretKey) {
      throw new PaymentError('CONFIG_MISSING', 'STRIPE_SECRET_KEY is missing.');
    }
    if (!webhookSecret) {
      throw new PaymentError(
        'CONFIG_MISSING',
        'STRIPE_WEBHOOK_SECRET is missing.'
      );
    }

    this.webhookSecret = webhookSecret;
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover', // Pinning to recent version to ensure stability
      typescript: true,
    });
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CheckoutSessionResult> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: input.currency,
              product_data: {
                name: 'Ticket Payment', // Generic name, could receive from input if needed
              },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: input.metadata,
      });

      console.log('[stripe] session created', { id: session.id });
      const acct = await this.stripe.accounts.retrieve();
      console.log('[stripe] account', acct.id);

      if (!session.url || !session.id) {
        throw new PaymentError(
          'PAYMENT_PROVIDER_ERROR',
          'Stripe session created but missing URL or ID.'
        );
      }

      return {
        url: session.url,
        providerSessionId: session.id,
      };
    } catch (err) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(
        'PAYMENT_PROVIDER_ERROR',
        'Failed to create Stripe checkout session.',
        err
      );
    }
  }

  async verifyAndParseEvent(
    body: string | Buffer,
    signature: string
  ): Promise<WebhookEventResult> {
    let event: Stripe.Event;

    try {
      console.log('[STRIPE] verify: bytes', body.length);
      console.log('[STRIPE] verify: sig prefix', signature.substring(0, 12));

      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      throw new PaymentError(
        'WEBHOOK_SIGNATURE_INVALID',
        'Stripe webhook signature verification failed.',
        err
      );
    }

    console.log('[STRIPE] verified event.type =', event.type, 'id =', event.id);

    const result: WebhookEventResult = {
      type: event.type,
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[STRIPE] session.id =', session.id);
      console.log(
        '[STRIPE] metadata keys =',
        session.metadata ? Object.keys(session.metadata) : []
      );
      result.providerSessionId = session.id;
      // Stripe metadata is a Record<string, string>, safe to pass through
      result.metadata = session.metadata || undefined;
    }

    return result;
  }
}
