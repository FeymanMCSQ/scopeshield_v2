/**
 * Stripe Webhook Route
 * Owns: HTTP boundary for Stripe webhooks (raw body intake + error mapping).
 * Does NOT own: signature verification details, payment orchestration, domain rules.
 * Layer: Edge
 * Trust zone: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { makePaymentsService } from '@/server/services';
import { PaymentError } from '@/application/payments/errors';
import { DomainError } from '@/domain/shared';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    // 1) Raw body is REQUIRED for Stripe signature verification
    const buf = Buffer.from(await req.arrayBuffer());
    const sig = req.headers.get('stripe-signature') ?? '';

    // 2) Minimal boundary diagnostics (dev-friendly)
    console.log('[WEBHOOK] hit', new Date().toISOString());
    console.log('[WEBHOOK] sig?', Boolean(sig), 'bytes', buf.length);

    if (!sig)
      return new NextResponse('Missing stripe-signature header', {
        status: 400,
      });
    if (buf.length === 0)
      return new NextResponse('Empty body', { status: 400 });

    // 3) Delegate all Stripe/domain logic to Application service
    await makePaymentsService().handleWebhook(buf, sig);

    console.log('[WEBHOOK] OK', `(${Date.now() - startedAt}ms)`);
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[WEBHOOK] ERROR', err, `(${Date.now() - startedAt}ms)`);

    // Payment boundary errors
    if (err instanceof PaymentError) {
      if (err.code === 'WEBHOOK_SIGNATURE_INVALID') {
        return new NextResponse(err.message, { status: 400 });
      }
      if (err.code === 'CHECKOUT_SESSION_INVALID') {
        // In dev, this is intentionally loud (misconfigured / missing metadata).
        // In prod, PaymentsService should generally ACK and log instead.
        return new NextResponse(err.message, { status: 400 });
      }
      // Provider/config/unknown payment errors
      return new NextResponse(err.message, { status: 500 });
    }

    // Domain errors should NOT cause webhook retry loops
    if (err instanceof DomainError) {
      console.warn(
        '[WEBHOOK] ACK domain error (no retry):',
        err.code,
        err.message
      );
      return new NextResponse('OK', { status: 200 });
    }

    // Unknown infra error → allow Stripe retries (500)
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
