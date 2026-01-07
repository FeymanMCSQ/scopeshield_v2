// src/app/api/ext/ticket/[id]/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { makeTicketService } from '@/server/services';
import { asTicketId, asUserId, DomainError } from '@/domain/shared';
import { requireDeviceActor } from '@/lib/identity/getActor';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🔐 Trust zone: extension device ONLY
  const actor = await requireDeviceActor(req);

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
      switch (err.code) {
        case 'NOT_FOUND':
          return new NextResponse(err.message, { status: 404 });
        case 'FORBIDDEN':
          return new NextResponse(err.message, { status: 403 });
        case 'CONFLICT':
        case 'INVARIANT_VIOLATION':
          return new NextResponse(err.message, { status: 409 });
        default:
          return new NextResponse(err.message, { status: 400 });
      }
    }

    console.error('[EXT_APPROVE] ERROR', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
