import { NextResponse } from 'next/server';
import { requireUserActor } from '@/lib/identity/getActor';
import { makeTicketService } from '@/server/services';
import { asUserId } from '@/domain/shared';
import { toHttpError } from '@/server/http/errors';

export const runtime = 'nodejs';

export async function GET() {
  const actor = await requireUserActor();

  try {
    const svc = makeTicketService();
    const tickets = await svc.getDashboard(asUserId(actor.userId));
    return NextResponse.json({ tickets }, { status: 200 });
  } catch (err: unknown) {
    const { status, body } = toHttpError(err);
    return NextResponse.json(body, { status });
  }
}
