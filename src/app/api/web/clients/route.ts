import { NextResponse } from 'next/server';
import { requireUserActor } from '@/lib/identity/getActor';
import { makeClientService } from '@/server/services';
import { asUserId } from '@/domain/shared';
import { toHttpError } from '@/server/http/errors';
export const runtime = 'nodejs';

type Body = {
  name: string;
};

export async function POST(req: Request) {
  const actor = await requireUserActor();

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const client = await makeClientService().createClient({
      userId: asUserId(actor.userId),
      name: body.name,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    const { status, body } = toHttpError(err);
    return NextResponse.json(body, { status });
  }
}
