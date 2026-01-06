import { NextRequest, NextResponse } from 'next/server';
import { makePaymentsService } from '@/server/services';
import { PaymentError } from '@/application/payments/errors';

export async function POST(request: NextRequest) {
  try {
    // ✅ Use raw bytes for Stripe signature verification (byte-perfect)
    const body = Buffer.from(await request.arrayBuffer());

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return new NextResponse('Missing signature', { status: 400 });
    }

    const service = makePaymentsService();
    await service.handleWebhook(body, signature);

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    if (err instanceof PaymentError) {
      if (err.code === 'WEBHOOK_SIGNATURE_INVALID') {
        return new NextResponse(err.message, { status: 400 });
      }

      console.error('Webhook PaymentError:', err);
      return new NextResponse(err.message, { status: 500 });
    }

    console.error('Webhook Unknown Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
