import { NextRequest, NextResponse } from 'next/server';
import { makePaymentsService } from '@/server/services';
import { DomainError } from '@/domain/shared';
import { PaymentError } from '@/application/payments/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> } // Next 15+ params are promises (awaiting just in case)
) {
  const { publicId } = await params;
  
  try {
    const service = makePaymentsService();
    const result = await service.startPublicCheckout(publicId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === 'NOT_FOUND') return new NextResponse(err.message, { status: 404 });
      if (err.code === 'CONFLICT') return new NextResponse(err.message, { status: 409 });
      return new NextResponse(err.message, { status: 400 });
    }
    if (err instanceof PaymentError) {
      return new NextResponse(err.message, { status: 500 }); // Provider error
    }
    console.error(err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
