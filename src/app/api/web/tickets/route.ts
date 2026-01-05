import { NextResponse } from 'next/server';
import { requireUserActor } from '@/lib/identity/getActor';
import { makeTicketService } from '@/server/services';
import { asClientId, asUserId, cents } from '@/domain/shared';
import { toHttpError } from '@/server/http/errors';
import { makeUserService } from '@/server/services';

type Body = {
  clientId: string;
  message: string;
  priceCents: number;
  assetUrl?: string | null;
};

export async function POST(req: Request) {
  const actor = await requireUserActor();

  await makeUserService().ensureUserExists({
    userId: asUserId(actor.userId),
    email: null, // we can fetch email later
  });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const svc = makeTicketService();

    const ticket = await svc.createTicket({
      userId: asUserId(actor.userId),
      clientId: asClientId(body.clientId),
      message: body.message,
      priceCents: cents(body.priceCents),
      assetUrl: body.assetUrl ?? null,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: unknown) {
    const { status, body } = toHttpError(err);
    return NextResponse.json(body, { status });
  }
}
