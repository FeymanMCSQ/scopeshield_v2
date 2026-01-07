import { NextRequest, NextResponse } from 'next/server';
import { makePaymentsService } from '@/server/services';
import { PaymentError } from '@/application/payments/errors';

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT: use arrayBuffer -> Buffer for signature integrity
    const buf = Buffer.from(await req.arrayBuffer());
    const sig = req.headers.get('stripe-signature');

    console.log('[WEBHOOK] hit', new Date().toISOString());
    console.log('[WEBHOOK] sig?', Boolean(sig), 'bytes', buf.length);

    if (!sig) return new NextResponse('Missing signature', { status: 400 });

    await makePaymentsService().handleWebhook(buf, sig);

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[WEBHOOK] ERROR', err);

    if (err instanceof PaymentError) {
      if (err.code === 'WEBHOOK_SIGNATURE_INVALID') {
        return new NextResponse(err.message, { status: 400 });
      }
      if (err.code === 'CHECKOUT_SESSION_INVALID') {
        // During dev, this should be 400 so you see it clearly.
        return new NextResponse(err.message, { status: 400 });
      }
      return new NextResponse(err.message, { status: 500 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
