// src/app/api/web/ticket/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { makeTicketService } from '@/server/services';
import { asTicketId, asUserId, DomainError } from '@/domain/shared';
import { requireUserActor } from '@/lib/identity/getActor';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireUserActor();
  const { id } = await params;

  let ticketId;
  try {
    ticketId = asTicketId(id);
  } catch {
    return new NextResponse('Invalid ticket id', { status: 400 });
  }

  try {
    const ticket = await makeTicketService().approveTicketAsUser(
      asUserId(actor.userId),
      ticketId
    );
    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === 'NOT_FOUND')
        return new NextResponse(err.message, { status: 404 });
      if (err.code === 'FORBIDDEN')
        return new NextResponse(err.message, { status: 403 });
      if (err.code === 'CONFLICT' || err.code === 'INVARIANT_VIOLATION')
        return new NextResponse(err.message, { status: 409 });
      return new NextResponse(err.message, { status: 400 });
    }

    console.error('[APPROVE_WEB] ERROR', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
