import { NextResponse } from 'next/server';
import { getActor } from '@/lib/identity/getActor';

export async function GET() {
  const actor = await getActor();
  return NextResponse.json(actor);
}
