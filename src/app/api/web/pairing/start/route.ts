// src/app/api/web/pairing/start/route.ts
import { NextResponse } from 'next/server';
import { requireUserActor } from '@/lib/identity/getActor';
import { makePairingService } from '@/server/services';
import { toHttpError } from '@/server/http/errors';

export async function POST() {
  try {
    const actor = await requireUserActor();
    const res = await makePairingService().startPairing({
      userId: actor.userId,
    });
    return NextResponse.json(res);
  } catch (err) {
    const http = toHttpError(err);
    return NextResponse.json(http.body, { status: http.status });
  }
}
