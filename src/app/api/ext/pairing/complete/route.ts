// /src/app/api/ext/pairing/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { makePairingService } from '@/server/services';
import { toHttpError } from '@/server/http/errors';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { pairingCode?: string; label?: string };

    const pairingCode = body.pairingCode?.trim();
    if (!pairingCode)
      return new NextResponse('pairingCode is required', { status: 400 });

    const userAgent = req.headers.get('user-agent') ?? undefined;

    const res = await makePairingService().completePairing({
      pairingCode,
      deviceMeta: { label: body.label, userAgent },
    });

    return NextResponse.json(res);
  } catch (err) {
    const http = toHttpError(err);
    return NextResponse.json(http.body, { status: http.status });
  }
}
