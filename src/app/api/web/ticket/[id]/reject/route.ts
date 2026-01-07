import { NextResponse } from 'next/server';
import { makeTicketService } from '@/server/services';
import { asTicketId, DomainError } from '@/domain/shared';
import { requireUserActor } from '@/lib/identity/getActor'; // adjust import path if yours differs

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Trust zone: web only
  await requireUserActor();

  const { id } = await params;

  let ticketId;
  try {
    ticketId = asTicketId(id);
  } catch {
    return new NextResponse('Invalid ticket id', { status: 400 });
  }

  try {
    const ticket = await makeTicketService().rejectTicket(ticketId);
    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === 'NOT_FOUND')
        return new NextResponse(err.message, { status: 404 });
      if (err.code === 'CONFLICT')
        return new NextResponse(err.message, { status: 409 });
      if (err.code === 'INVARIANT_VIOLATION')
        return new NextResponse(err.message, { status: 409 });
      return new NextResponse(err.message, { status: 400 });
    }

    console.error('[REJECT] ERROR', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
